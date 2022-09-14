const { setOutput, setFailed, info, getInput } = require('@actions/core');
const { fetch, Headers } = require('undici');
const semver = require('semver');

const getAuthToken = async (repository) => {
  const url = `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repository}:pull,push`;
  const response = await fetch(url);

  if (response.ok) {
    return await response.json();
  }

  throw new Error('Failed to fetch authentication token.');
};

const getTags = async (repository) => {
  const { token } = await getAuthToken(repository);
  const url = `https://registry.hub.docker.com/v2/${repository}/tags/list`;
  const response = await fetch(url, {
    headers: new Headers({
      authorization: `Bearer ${token}`,
    }),
  });

  if (response.ok) {
    return await response.json();
  }

  throw new Error('Failed to fetch tags from Docker Hub.');
};

const main = async () => {
  try {
    const ignoredTags = getInput('ignored-tags').split(',');
    const from = getInput('from');

    const { tags: nodeTags } = await getTags(from);

    const regex = /^(14|16|18)\.\d{1,2}\.\d{1,2}-alpine$/;

    const toBuild = new Set(
      nodeTags.filter((tag) => regex.test(tag) && !ignoredTags.includes(tag))
    );
    const currentTags = builderTags.filter((tag) => regex.test(tag));

    currentTags.forEach((tag) => {
      toBuild.delete(tag);
    });

    const sortedTags = semver.sort([...toBuild]);
    setOutput('matrix', sortedTags);
  } catch (error) {
    setFailed(error.message);
  }
};

main();
