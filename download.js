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

const directoryPrefix = './sourceFiles-' + dateformat(new Date(), 'yyyymmdd')

const streamPipeline = promisify(pipeline);

const download = async (url, filepath) => {
  const response = await fetch(url);
  streamToString(response.body).then(async res => {
    if (res.trim().startsWith('export default')) {
      res = res.replace(/^export\sdefault/, 'module.exports =')
    }
    await streamPipeline(stringToStream(res), createWriteStream(filepath));
  })
}

const generateEmptyFile = async (filepath) => {
  await streamPipeline(stringToStream(config.emptySourceFile), createWriteStream(filepath));
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
        generateEmptyFile(filepath)
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