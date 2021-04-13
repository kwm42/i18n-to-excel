
const cloneDeep = require('lodash.clonedeep')

var tempKeyMappingObj = {}

const _flattenObject = (obj, keyPath) => {
  const keys = Object.keys(obj)
  keys.forEach(key => {
    const mappingKey = keyPath ? `${keyPath}.${key}` : key
    if (typeof obj[key] === 'string') {
      tempKeyMappingObj[mappingKey] = obj[key]
    } else if (typeof obj[key] === 'object') {
      _flattenObject(obj[key], mappingKey)
    }
  })
  return cloneDeep(tempKeyMappingObj)
}

module.exports = {
  /**
   * return obj1 - (obj1 ∩ obj2)
   */
  getDifferentSet: (obj1, obj2) => {
    var newObj = {}
    Object.keys(obj1).forEach(key => {
      if (!obj2.hasOwnProperty(key) || obj1[key] != obj2[key]) {
        newObj[key] = obj1[key]
      }
    })
    return newObj
  },
  flattenObject: (data) => {
    tempKeyMappingObj = {}
    return _flattenObject(data)
  },
  checkIsDirectory: dirPath => {
    try {
      const stat = fs.statSync(dirPath)
      return stat.isDirectory()
    } catch (error) {
      return false
    }
  }
}