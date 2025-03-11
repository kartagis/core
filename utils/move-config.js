'use strict';

const _ = require('lodash');
const copydir = require('copy-dir');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const remove = require('./remove');

/**
 * Copies configuration files from a source directory to a destination directory,
 * excluding .js files and making .sh files executable.
 *
 * @param {string} src - Source directory path containing config files to copy
 * @param {string} [dest=os.tmpdir()] - Destination directory path. Defaults to system temp dir
 * @return {string} Path to the destination directory where files were copied
 * @throws {Error} If copying files fails and cannot be recovered
 *
 * @example
 * // Copy config files from a plugin's scripts directory to the user's scripts directory
 * const userScriptsDir = path.join(lando.config.userConfRoot, 'scripts');
 * const configDir = moveConfig(path.join(__dirname, '../scripts'), userScriptsDir);
 * console.log('Config files moved to:', configDir);
 */
module.exports = (src, dest = os.tmpdir()) => {
  // Copy opts and filter out all js files
  // We don't want to give the false impression that you can edit the JS
  const filter = (stat, filepath, filename) => (path.extname(filename) !== '.js');
  // Ensure to exists
  fs.mkdirSync(dest, {recursive: true});
  // Try to copy the assets over
  try {
    // @todo: why doesn't the below work for PLD?
    copydir.sync(src, dest, filter);
    require('./make-executable')(_(fs.readdirSync(dest))
      .filter(file => path.extname(file) === '.sh')
      .value()
    , dest);
  } catch (error) {
    const code = _.get(error, 'code');
    const syscall = _.get(error, 'syscall');
    const f = _.get(error, 'path');

    // Catch this so we can try to repair
    if (code !== 'EISDIR' || syscall !== 'open' || !!fs.mkdirSync(f, {recursive: true})) {
      remove(f);
      throw new Error(error);
    }

    // Try to take corrective action
    remove(f);
    copydir.sync(src, dest, filter);
    require('./make-executable')(_(fs.readdirSync(dest))
      .filter(file => path.extname(file) === '.sh')
      .value()
    , dest);
  }

  // Return the new scripts directory
  return dest;
};
