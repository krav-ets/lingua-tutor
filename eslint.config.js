import antfu from '@antfu/eslint-config';

export default antfu({
  stylistic: {
    semi: true,
  },
  rules: {
    semi: ['error', 'always'], // Require semicolons at the end of statements
  },
});
