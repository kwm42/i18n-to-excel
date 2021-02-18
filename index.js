const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')
const cloneDeep = require('lodash.clonedeep')

let tempKeyMappingObj = {}
const targetTranslationObjs = []

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

const parseTranslationJSONFile = (filePath, filename) => {
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

  const mergedLanguageData = mergeMultiLanguages(flatternedContentZh, flatternedContentEn, flatternedContentHk, flatternedContentAr)
  targetTranslationObjs.push(Object.assign({}, {
    value: mergedLanguageData
  }, {
    filename: path.basename(filename, path.extname(filename))
  }))
  // targetTranslationObjs.push(Object.assign({}, {
  //   value: tempKeyMappingObj
  // }, {
  //   filename: path.basename(filename, path.extname(filename))
  // }))
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
  // let data = [
  //   [ { colA: 1, colB: 2, colC: 3 }, { colA: 4, colB: 5, colC: 6 }, { colA: 7, colB: 8, colC: 9 } ],
  //   [ { colA:11, colB:12, colC:13 }, { colA:14, colB:15, colC:16 }, { colA:17, colB:18, colC:19 } ],
  //   [ { colA:21, colB:22, colC:23 }, { colA:24, colB:25, colC:26 }, { colA:27, colB:28, colC:29 } ]
  // ]
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
  getFilesByPath('./sourceFiles')
}

main()