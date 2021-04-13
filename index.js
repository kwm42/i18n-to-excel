const XLSX = require('xlsx')
const fse = require('fs-extra')
const {createWriteStream} = require('fs')
const path = require('path')
const xml2js = require('xml2js')
const fetch = require('node-fetch');
const {pipeline} = require('stream');
const {promisify} = require('util');
const { checkIsDirectory, flattenObject, getDifferentSet } = require('./utils.js')
const yargs = require('yargs')
const dateformat = require('dateformat')
const config = require('./config')
const { downloadI18nSourceFiles } = require('./download')
const { sourceDirectoryPrefix, i18nSourceConfig } = config

const targetTranslationData = []

const getFilesByPath = (dirPath) => {
  const lastDate = yargs.argv.lastDate
  const nowDate = dateformat(new Date(), 'yyyymmdd')
  i18nSourceConfig.forEach(cfg => {
    let newData, oldData, resultData
    newData = parseTranslationFileToJson(dirPath + nowDate, cfg.name + (cfg.ext || '.js'))
    oldData = lastDate
      ? parseTranslationFileToJson(dirPath + lastDate, cfg.name + (cfg.ext || '.js'))
      : null

    resultData = lastDate ? diffObjs(newData, oldData) : newData
    if (Object.keys(resultData.zhCN).length === 0) {
      return
    }
    const mergedLanguageData = mergeMultiLanguages(Object.keys(resultData).map(key => resultData[key]))

    targetTranslationData.push(Object.assign({}, {
      value: mergedLanguageData
    }, {
      filename: cfg.name
    }))
  })

  exportToFiles('./exports')
}

const exportToFiles = (targetDir) => {
  fse.removeSync(targetDir)
  fse.ensureDirSync(targetDir)
  let wholeWorkBook = XLSX.utils.book_new()
  targetTranslationData.forEach((item, i) => {
    const array = item.value
    array.unshift(['key', 'zh_CN', 'en_US', 'zh_HK', 'ar_SA'])
    let ws = XLSX.utils.json_to_sheet(array, { skipHeader: true })
    let wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "SheetJS")
    XLSX.utils.book_append_sheet(wholeWorkBook, ws, item.filename.slice(0, 31))
    let exportFileName = `./${targetDir}/${item.filename}.xlsx`;
    XLSX.writeFile(wb, exportFileName)
  })
  XLSX.writeFile(wholeWorkBook, `./${targetDir}/all.xlsx`)
}

const diffObjs = (newData, oldData) => {
  const oldZhData = oldData.zhCN
  const newZhData = newData.zhCN
  const diffZh = getDifferentSet(newZhData, oldZhData)
  const diffEn = generateDiffDataBasedOnZh(diffZh, newData.enUS)
  const diffHk = generateDiffDataBasedOnZh(diffZh, newData.zhHK)
  const diffAr = generateDiffDataBasedOnZh(diffZh, newData.arEG)
  return {
    zhCN: diffZh,
    enUS: diffEn,
    zhHK: diffHk,
    arEG: diffAr
  }
}

const generateDiffDataBasedOnZh = (zh, data) => {
  var result = {}
  Object.keys(zh).forEach(key => {
    result[key] = data[key] || ''
  })
  return result
}

const mergeMultiLanguages = (contents) => {
  const translatedData = transformObjsToXlsxObj(contents)
  return translatedData
}

const transformObjsToXlsxObj = (objs) => {
  if (!Array.isArray(objs)) {
    return
  }
  const keys = Object.keys(objs[0])
  const xlsxData = []
  keys.forEach(key => {
    let row = [key]
    row = row.concat(objs.map(value => value[key] || ''))
    xlsxData.push(row)
  })
  return xlsxData
}

const parseTranslationFileToJson = (dirPath, baseName) => {
  const contentZh = require(`${dirPath}/zhCN/${baseName}`)
  const contentEn = require(`${dirPath}/enUS/${baseName}`)
  const contentHk = require(`${dirPath}/zhHK/${baseName}`)
  const contentAr = require(`${dirPath}/arEG/${baseName}`)

  const flattenedContentZh = flattenObject(contentZh)
  const flattenedContentEn = flattenObject(contentEn)
  const flattenedContentHk = flattenObject(contentHk)
  const flattenedContentAr = flattenObject(contentAr)
  return {
    zhCN: flattenedContentZh,
    enUS: flattenedContentEn,
    zhHK: flattenedContentHk,
    arEG: flattenedContentAr
  }
}

const main = async () => {
  // await downloadI18nSourceFiles()
  getFilesByPath(sourceDirectoryPrefix)
}

main()