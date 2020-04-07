const { exec } = require('child_process');
const axios = require('axios');
const AdmZip = require('adm-zip');
const fs = require('fs-extra');

module.exports = async (urlZip, urlPackage, branch) => {
  try {
    const { name, version, dependencies } = await fs.readJSON('./package.json');
    const fetchRemotePackage = await axios.get(`${urlPackage}/${branch}/package.json`);
    const remoteVersion = fetchRemotePackage.data.version;
    const remoteDependencies = fetchRemotePackage.data.dependencies;

    if (version !== remoteVersion) {
      const { data } = await axios({
        method: 'get',
        url: `${urlZip}/${branch}`,
        responseType: 'stream',
      });
      const file = fs.createWriteStream('updateFiles.zip');
      data.pipe(file);

      file.once('finish', async () => {
        const zip = new AdmZip('updateFiles.zip');
        zip.extractAllTo('./', true);

        const extractedFolder = `./${name}-${branch}`;
        const listEntries = await fs.readdir(extractedFolder);
        await Promise.all(listEntries.map(async (entry) => fs.move(`${extractedFolder}/${entry}`, `./${entry}`, { overwrite: true })));

        await fs.remove('updateFiles.zip');
        await fs.remove(extractedFolder);

        const dependenciesKey = Object.keys(dependencies);
        const remoteDependenciesKey = Object.keys(remoteDependencies);
        if (dependenciesKey.length !== remoteDependenciesKey.length) {
          exec('npm install', (e, stdout, stderr) => {
            if (e instanceof Error) {
              console.error(e);
              throw e;
            }
            console.log(stdout);
            console.error(stderr);

            process.exit(0);
            return false;
          });
        } else {
          process.exit(0);
          return false;
        }
      });
    } else {
      console.log('The software is up to date');
      return true;
    }
  } catch (e) {
    return true;
  }
};
