/**
 * Conventional Commits — https://www.conventionalcommits.org
 *
 *   <type>(<optional scope>): <description>
 *
 * Examples:
 *   feat(kanban): allow dragging tasks between columns
 *   fix(auth): stop logging in on invalid credentials
 *   docs: add setup guide to README
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert', 'security'],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
};
