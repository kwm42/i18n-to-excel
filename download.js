const {createWriteStream} = require('fs');
const path = require('path')
const fse = require('fs-extra')
const {pipeline} = require('stream');
const {promisify} = require('util');
const fetch = require('node-fetch');
const config = require('./config')
const streamToString = require('stream-to-string')
const stringToStream = require('string-to-stream')
const yargs = require('yargs')
const dateformat = require('dateformat')
const i18nSourceConfig = config.i18nSourceConfig

const cookie = `sidebar_collapsed=false; remember_user_token=eyJfcmFpbHMiOnsibWVzc2FnZSI6Ilcxc3lPREUzWFN3aUpESmhKREV3SkUweVVESnJUbmx4ZUVsNlZtcG5WRTFVYm1VM1pVOGlMQ0l4TmpZeU5ESTJORFkyTGpNMU9UTXpPRFVpWFE9PSIsImV4cCI6IjIwMjItMDktMjBUMDE6MDc6NDYuMzU5WiIsInB1ciI6ImNvb2tpZS5yZW1lbWJlcl91c2VyX3Rva2VuIn19--a0dd7ce603b756870508e4405093b9dbbf420b1e; _gitlab_session=b7fe27bb2c1c8abadb44286c2db1c585; event_filter=all`

const directoryPrefix = './sourceFiles-' + dateformat(new Date(), 'yyyymmdd')

const streamPipeline = promisify(pipeline);

const download = async (url, filepath) => {
  const response = await fetch(url, {
    headers: {
      Cookie: cookie
    }
  });
  streamToString(response.body).then(async res => {
    if (res.trim().startsWith('export default')) {
      res = res.replace(/^export\sdefault/, 'module.exports =')
    }
    await streamPipeline(stringToStream(res), createWriteStream(filepath));
  })
}

const generateEmptyFile = async (filepath, ext) => {
  const emptyFileContent = ext === '.json' ? config.emptySourceFileJson : config.emptySourceFile
  await streamPipeline(stringToStream(emptyFileContent), createWriteStream(filepath));
}

const downloadI18nSourceFiles = async () => {
  fse.removeSync(directoryPrefix)

  i18nSourceConfig.forEach(config => {
    const { i18nSourceFiles } = config
    Object.keys(i18nSourceFiles).forEach(key => {
      const file = i18nSourceFiles[key]
      const extname = config.ext || '.js'
      const filepath = `${directoryPrefix}/${key}/${config.name}${extname}`
      fse.ensureFileSync(filepath)
      
      if (!file) {
        generateEmptyFile(filepath, config.ext)
      } else {
        download(file, filepath)
      }
    })
  })
}

// downloadI18nSourceFiles()

module.exports = {
  downloadI18nSourceFiles
}