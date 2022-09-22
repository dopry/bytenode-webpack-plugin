const ref = process.env.GITHUB_REF || ''
const branch = ref.replace('refs/heads/', '')

const config = { branches: [
  '+([0-9])?(.{+([0-9]),x}).x',
  'main',
  { name: 'next', prerelease: true },
], plugins: [] }

const prerelease = config.branches.some(
  (it) => it.name === branch && it.prerelease
)
console.log('debug', { branch, prerelease, ref })

config.plugins.push('@semantic-release/commit-analyzer')
config.plugins.push('@semantic-release/release-notes-generator')

// do not update changelog on pre releasese
if (!prerelease) {
  config.plugins.push([
    '@semantic-release/changelog',
    {
      changelogFile: 'docs/CHANGELOG.md',
    },
  ])
}
config.plugins.push('@semantic-release/npm')

const pluginGit = [
  '@semantic-release/git',
  {
    assets: ['package.json'],
    message: 'chore(release): ${nextRelease.version}\n\n${nextRelease.notes}',
  },
]
if (!prerelease) {
  pluginGit[1].assets.push('docs/CHANGELOG.md')
}
config.plugins.push(pluginGit)

module.exports = config
