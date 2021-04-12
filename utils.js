module.exports = {
  /**
   * return obj1 - (obj1 ∩ obj2)
   */
  getDifferentSet: (obj1, obj2) => {
    var newObj = {}
    Object.keys(obj1).forEach(key => {
      if (!obj2.hasOwnProperty(key)) {
        newObj[key] = obj1[key]
      }
    })
    return newObj
  }
}