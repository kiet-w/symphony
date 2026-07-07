import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';

const token = process.env.GITHUB_TOKEN;

if (!token) {
  throw new Error('GITHUB_TOKEN is not set in environment variables.');
}

const octokit = new Octokit({ auth: token });
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${token}`,
  },
});

function getRepoConfig() {
  const owner = process.env.GITHUB_OWNER || process.env.GITHUB_REPOSITORY?.split('/')[0] || '';
  const repo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
  const projectNumber = parseInt(process.env.GITHUB_PROJECT_NUMBER || '0', 10);
  
  return { owner, repo, projectNumber };
}

export async function getBoard() {
  const { owner, repo, projectNumber } = getRepoConfig();
  
  if (!owner || !repo || !projectNumber) {
    throw new Error('Missing GITHUB_OWNER, GITHUB_REPO, or GITHUB_PROJECT_NUMBER');
  }

  const query = `
    query($owner: String!, $repo: String!, $projectNumber: Int!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        projectV2(number: $projectNumber) {
          id
          title
          items(first: 100, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                }
              }
              content {
                ... on Issue {
                  id
                  number
                  title
                  state
                  assignees(first: 10) {
                    nodes {
                      login
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  let hasNextPage = true;
  let cursor: string | null = null;
  const allNodes: any[] = [];
  let projectTitle = '';
  let projectId = '';

  while (hasNextPage) {
    const response: any = await graphqlWithAuth(query, {
      owner,
      repo,
      projectNumber,
      cursor,
    });

    const projectV2 = response.repository.projectV2;
    if (!projectV2) {
      throw new Error(`Project V2 with number ${projectNumber} not found.`);
    }

    projectId = projectV2.id;
    projectTitle = projectV2.title;
    allNodes.push(...projectV2.items.nodes);

    hasNextPage = projectV2.items.pageInfo.hasNextPage;
    cursor = projectV2.items.pageInfo.endCursor;
  }

  return {
    repository: {
      projectV2: {
        id: projectId,
        title: projectTitle,
        items: {
          nodes: allNodes
        }
      }
    }
  };
}

export async function claimTicket(issueNumber: number, assignee: string) {
  const { owner, repo } = getRepoConfig();
  
  if (!owner || !repo) {
    throw new Error('Missing GITHUB_OWNER or GITHUB_REPO');
  }

  const response = await octokit.rest.issues.addAssignees({
    owner,
    repo,
    issue_number: issueNumber,
    assignees: [assignee],
  });

  return response.data;
}

export async function setStatus(issueNumber: number, status: string) {
  const { owner, repo, projectNumber } = getRepoConfig();

  if (!owner || !repo || !projectNumber) {
    throw new Error('Missing GITHUB_OWNER, GITHUB_REPO, or GITHUB_PROJECT_NUMBER');
  }

  const infoQuery = `
    query($owner: String!, $repo: String!, $projectNumber: Int!, $issueNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) {
          id
          projectItems(first: 10) {
            nodes {
              id
              project {
                id
                number
              }
            }
          }
        }
        projectV2(number: $projectNumber) {
          id
          field(name: "Status") {
            ... on ProjectV2SingleSelectField {
              id
              options {
                id
                name
              }
            }
          }
        }
      }
    }
  `;

  // ponytail: cast any instead of 26-line InfoQueryResponse interface
  const info = await graphqlWithAuth<any>(infoQuery, {
    owner,
    repo,
    projectNumber,
    issueNumber,
  });

  const projectV2 = info.repository.projectV2;
  if (!projectV2) {
    throw new Error(`Project V2 with number ${projectNumber} not found.`);
  }

  const projectId = projectV2.id;
  const statusField = projectV2.field;
  
  if (!statusField) {
    throw new Error('Status field not found in the project.');
  }

  const statusFieldId = statusField.id;
  const options = statusField.options;
  
  const targetOption = options.find((opt: any) => opt.name.toLowerCase() === status.toLowerCase());
  
  if (!targetOption) {
    throw new Error(`Status option '${status}' not found. Available options: ${options.map((o: any) => o.name).join(', ')}`);
  }

  const optionId = targetOption.id;
  
  const issue = info.repository.issue;
  if (!issue) {
    throw new Error(`Issue #${issueNumber} not found.`);
  }

  const projectItems = issue.projectItems.nodes;
  const targetItem = projectItems.find((item: any) => item.project.number === projectNumber);
  
  let itemId;
  if (targetItem) {
    itemId = targetItem.id;
  } else {
    // If the issue is not in the project, add it first
    const issueId = issue.id;
    const addQuery = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
          item {
            id
          }
        }
      }
    `;
    const addResult: any = await graphqlWithAuth(addQuery, {
      projectId,
      contentId: issueId,
    });
    itemId = addResult.addProjectV2ItemById.item.id;
  }

  const updateQuery = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId,
        itemId: $itemId,
        fieldId: $fieldId,
        value: {
          singleSelectOptionId: $optionId
        }
      }) {
        projectV2Item {
          id
        }
      }
    }
  `;

  try {
    const response = await graphqlWithAuth(updateQuery, {
      projectId,
      itemId,
      fieldId: statusFieldId,
      optionId,
    });
    return response;
  } catch (error) {
    if (!targetItem) {
      // ponytail: yagni rollback mutation for a rare two-step failure. add when it actually bites.
      throw new Error(`Failed to set status (issue added to project but status failed). Original error: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
}

export async function postSignal(issueNumber: number, payload: string) {
  const { owner, repo } = getRepoConfig();
  
  if (!owner || !repo) {
    throw new Error('Missing GITHUB_OWNER or GITHUB_REPO');
  }

  const response = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: payload,
  });

  return response.data;
}
