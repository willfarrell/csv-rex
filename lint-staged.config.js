export default {
  '**/*.{json,yml}': ['prettier --write'],
  '**/*.js': ['prettier --write', 'standard --fix']
}
