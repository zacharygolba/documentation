var fs = require('fs');
var path = require('path');
var gitUrlParse = require('git-url-parse');
var getRemoteOrigin = require('remote-origin-url');

function parsePackedRefs(packedRefs, branchName) {
  return packedRefs.split(/\n/)
    .filter(function (line) {
      return line[0] !== '#' && line[0] !== '^';
    })
    .reduce(function (memo, line) {
      memo[line.split(' ')[1]] = line.split(' ')[0];
      return memo;
    }, {})[branchName];
}

/**
 * Given a a root directory, find its git configuration and figure out
 * the HTTPS URL at the base of that GitHub repository.
 *
 * @param {string} root path at the base of this local repo
 * @returns {string} base HTTPS url of the GitHub repository
 * @throws {Error} if the root is not a git repo
 */
function getGithubURLPrefix(root) {
  try {
    var head = fs.readFileSync(path.join(root, '.git', 'HEAD'), 'utf8');
    var branch = head.match(/ref\: (.*)/);
    if (branch) {
      var branchName = branch[1];
      var branchFileName = path.join(root, '.git', branchName);
      var packedRefsName = path.join(root, '.git', 'packed-refs');
      var sha;
      if (fs.existsSync(branchFileName)) {
        sha = fs.readFileSync(branchFileName, 'utf8');
      } else if (fs.existsSync(packedRefsName)) {
        // packed refs are a compacted version of the refs folder. usually
        // you have a folder filled with files that just contain sha
        // hashes. since this folder can be really big, packed refs
        // stores all the refs in one file instead.
        sha = parsePackedRefs(fs.readFileSync(packedRefsName, 'utf8'), branchName);
      }
    } else {
      sha = head;
    }
    return gitUrlParse(getRemoteOrigin.sync(root)).toString('https') + '/blob/' + sha.trim() + '/';
  } catch (e) {
    return null;
  }
}

module.exports = getGithubURLPrefix;
module.exports.parsePackedRefs = parsePackedRefs;
