const XLSX = require('xlsx')
const fs = require('fs')
const {createWriteStream} = require('fs')
const path = require('path')
const cloneDeep = require('lodash.clonedeep')
const xml2js = require('xml2js')
const fetch = require('node-fetch');
const {pipeline} = require('stream');
const {promisify} = require('util');

let tempKeyMappingObj = {}
const targetTranslationObjs = []
const streamPipeline = promisify(pipeline);

const logToConsole = (obj) => {
  console.log(JSON.stringify(obj, null, 2))
}

const checkIsDirectory = (dirPath) => {
  try {
    const stat = fs.statSync(dirPath)
    return stat.isDirectory()
  } catch (error) {
    return false
  }
}

const getFilesByPath = (path) => {
  const filesDir = fs.readdirSync(path)
  filesDir.forEach(file => {
    if (checkIsDirectory(`${path}/${file}`)) {
      return
    }
    parseTranslationJSONFile(`${path}/${file}`, file)
  })
  exportToFiles('exports')
}

const exportXmlFile = (data, filename, language) => {
  const xmlBuilder = new xml2js.Builder()
  const xml = xmlBuilder.buildObject(data)
  const path = `./xmls/${language ? language + '/' : ''}${filename}.xml`
  fs.writeFileSync(path, xml)
}

const translateJsonToXml = (data, filename, language) => {
  const keys = Object.keys(data)
  const xmlData = keys.map(key => ({
    _: data[key],
    $: {
      name: key
    }
  }))
  const xmlJSON = {
    resources: {
      string: xmlData
    }
  }
  exportXmlFile(xmlJSON, filename, language)
}

const translateJsonsToXmls = (languages, filename) => {
  const keys = Object.keys(languages)
  keys.forEach(key => {
    translateJsonToXml(languages[key], filename, key)
  })
}

const parseTranslationJSONFile = (filePath, filepath) => {
  // const content = fs.readFileSync(filePath, 'utf-8')
  const dirPath = path.dirname(filePath)
  const baseName = path.basename(filePath)
  const contentZh = require(`${dirPath}/${baseName}`)
  const contentEn = require(`${dirPath}/en/${baseName}`)
  const contentHk = require(`${dirPath}/hk/${baseName}`)
  const contentAr = require(`${dirPath}/ar/${baseName}`)

  const flatternedContentZh = flatternObject(contentZh)
  const flatternedContentEn = flatternObject(contentEn)
  const flatternedContentHk = flatternObject(contentHk)
  const flatternedContentAr = flatternObject(contentAr)

  const filename = path.basename(filepath, path.extname(filepath))
  translateJsonsToXmls({
    zh: flatternedContentZh,
    en: flatternedContentEn,
    hk: flatternedContentHk,
    ar: flatternedContentAr
  }, filename)

  const mergedLanguageData = mergeMultiLanguages(flatternedContentZh, flatternedContentEn, flatternedContentHk, flatternedContentAr)
  targetTranslationObjs.push(Object.assign({}, {
    value: mergedLanguageData
  }, {
    filename
  }))
}

const xmlTest = () => {
  const xmlData = fs.readFileSync('./sample.xml')
  const xmlParser = new xml2js.Parser()
  const xmlBuilder = new xml2js.Builder()
  xmlParser.parseString(xmlData, function(err, result) {
    // logToConsole(result)
  })
  const xmlJSON = {
    resources: {
      string: [
        {
          _: '1111',
          $: {
            name: 'as'
          }
        }
      ]
    }
  }
  const xml = xmlBuilder.buildObject(xmlJSON)
  logToConsole(xml)
  fs.writeFileSync('./exportXml.xml', xml)
}

const mergeMultiLanguages = (contentZh, contentEn, contentHk, contentAr) => {
  const translatedData = transformObjsToXlsxObj([contentZh, contentEn, contentHk, contentAr])
  return translatedData
}

const flatternObject = (obj, keyPath) => {
  tempKeyMappingObj = {}
  return _flatternObject(obj, keyPath)
}

const _flatternObject = (obj, keyPath) => {
  const keys = Object.keys(obj)
  keys.forEach(key => {
    const mappingKey = keyPath ? `${keyPath}.${key}` : key
    if (typeof obj[key] === 'string') {
      tempKeyMappingObj[mappingKey] = obj[key]
    } else if (typeof obj[key] === 'object') {
      _flatternObject(obj[key], mappingKey)
    }
  })
  return cloneDeep(tempKeyMappingObj)
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

const transformObjArrayToXlsxObjArray = (objArray) => {
  if (objArray.length === 0) {
    return []
  }
  return objArray.map(obj => {
    const data = []
    const translationValue = obj.value || {}
    Object.keys(translationValue).forEach(key => {
      data.push([key, translationValue[key]])
    })
    return {
      data,
      name: obj.filename
    }
  })
}

const exportToFiles = (targetDir) => {
  let wholeWorkBook = XLSX.utils.book_new()
  targetTranslationObjs.forEach((item, i) => {
    const array = item.value
    array.unshift(['key', 'zh_CN', 'en_US', 'zh_HK', 'ar_SA'])
    let ws = XLSX.utils.json_to_sheet(array, { skipHeader: true })
    let wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "SheetJS")
    XLSX.utils.book_append_sheet(wholeWorkBook, ws, item.filename.slice(0, 31))
    let exportFileName = `./${targetDir}/${item.filename}.xls`;
    // let exportFileName = `./workbook_${i}.xls`;
    XLSX.writeFile(wb, exportFileName)
  })
  XLSX.writeFile(wholeWorkBook, `./${targetDir}/全部翻译.xls`)
}

const main = () => {
  // getFilesByPath('./sourceFiles')
}

main()