const { PROMISE_STATUS } = require('./constants')
const { isArray, isPromise, isFunction, runResolvePromiseWithErrorCapture } = require('./utils')


function Promise(executor) {
    this.value = undefined
    this.reason = undefined

    this.status = PROMISE_STATUS.PENDING // 默认为pending状态

    this.fulfilledCallbacks = [] // 状态为fulfilled的回调函数队列
    this.rejectedCallbacks = [] // 状态为reject的回调函数队列  


    // promise内部做了回调函数的异常捕获  
    try {
        executor(resolve.bind(this), reject.bind(this))
    } catch (err) {
        reject(err)
    }

    // -----------------------------------------------------------------------------------

    function resolve(value) {
        // status修改为fullfilled或者rejected后不再允许修改
        if (this.status !== PROMISE_STATUS.PENDING) return

        // 保留resolve的入参  
        this.value = value
        this.status = PROMISE_STATUS.FULFILLED

        // 保证在添加了所有then回调函数之后，再 一次调用回调队列  
        setTimeout(() => this.fulfilledCallbacks.forEach(fulfilledCallback => fulfilledCallback(value)), 0)
    }

    function reject(reason) {
        if (this.status !== PROMISE_STATUS.PENDING) return

        this.reason = reason
        this.status = PROMISE_STATUS.REJECTED


        setTimeout(() => this.rejectedCallbacks.forEach(rejectedCallback => rejectedCallback(reason)), 0)
    }
}

// ---------------------------------------------------------------------------------------------

Promise.prototype.then = function (onFulfilled, onRejected) {
    // 入参的类型检查 
    onFulfilled = isFunction(onFulfilled) ? onFulfilled : data => data
    onRejected = isFunction(onRejected) ? onRejected : err => { throw err }

    let promise2 = new Promise((resolve, reject) => {
        switch (this.status) {
//promise中是同步代码,settimeout是为了能拿到promise2，以下settimeout同理
            case PROMISE_STATUS.FULFILLED:
            // TODO:
                setTimeout(() => {
                    runResolvePromiseWithErrorCapture(promise2, onFulfilled, resolve, reject, this.value)
                }, 0)
                break
//promise中是同步代码
            case PROMISE_STATUS.REJECTED:
            // TODO: 
            // onFulfilled 和 onFulfilled的调用需要放在setTimeout，因为规范中表示: onFulfilled or onRejected must not be called until the execution context stack contains only platform code。使用setTimeout只是模拟异步，原生Promise并非是这样实现的


                setTimeout(() => {
                    runResolvePromiseWithErrorCapture(promise2, onRejected, resolve, reject, this.reason)
                }, 0)
                break
                // promise中是异步代码
            case PROMISE_STATUS.PENDING:
                this.rejectedCallbacks.push(reason => runResolvePromiseWithErrorCapture(promise2, onRejected, resolve, reject, reason))
                this.fulfilledCallbacks.push(value => runResolvePromiseWithErrorCapture(promise2, onFulfilled, resolve, reject, value))
        }
    })

    return promise2
}

Promise.prototype.catch = function (onRejected) {
    return this.then(null, onRejected)
}

Promise.prototype.finally = function (callback) {
    return this.then(
        value => Promise.resolve(callback()).then(() => value),
        err => Promise.resolve(callback()).then(() => { throw err })
    )
}

// ----------------------------------------------------------------------------------------------------------------------------------------

Promise.resolve = function (value) {
    return value instanceof Promise ? value : new Promise(resolve => resolve(value))
}

Promise.reject = function (reason) {
    return new Promise((resolve, reject) => reject(reason))
}

Promise.all = function (promises) {
    promises = isArray(promises) ? promises : []

    let fulfilledCount = 0
    let promisesLength = promises.length
    let results = new Array(promisesLength)

    return new Promise((resolve, reject) => {
        if (promisesLength === 0) return resolve([])

        promises.forEach((promise, index) => {
            if (isPromise(promise)) {
                promise.then(
                    value => {
                        results[index] = value

                        if (++fulfilledCount === promisesLength) resolve(results)
                    },
                    err => reject(err)
                )
            } else {
                results[index] = promise

                if (++fulfilledCount === promisesLength) resolve(results)
            }

        })
    })
}

 Promise.allSettled = function(arr) {
    let resArr = [];
    let num = 0;

    if(!Array.isArray(arr)) {
      throw new Error('Array must be an array')
    }

    return new Promise((resolve, reject) =>{
       arr.forEach((item,index) => {
        if (item instanceof Promise) {
          item.then((res) => {
            resArr[index] = {status:'filfilled',value:res}
            if(++num === arr.length) {
              resolve(resArr)
            }
          }, (err) => {
                resArr[index] = {status: 'reject', value: err}

             if (++num === arr.length) {
                resolve(resArr)
              } 
          })
        } else {

            resArr[index] = {status: 'filfilled', value: item}
          if (++num === arr.length) {
            resolve(resArr)
          }
        }
      })
    })
  }

Promise.race = function (promises) {
    promises = isArray(promises) ? promises.filter(isPromise) : []

    return new Promise((resolve, reject) => {
        promises.forEach(promise => {
            promise.then(value => resolve(value), err => reject(err))
        })
    })
}

//测试脚本  npm install -g promises-aplus-tests  promises-aplus-tests promise.js

Promise.defer = Promise.deferred = function () {
    let dfd = {}

    dfd.promise = new Promise((resolve, reject) => {
        dfd.resolve = resolve
        dfd.reject = reject
    })

    return dfd
}

module.exports = Promise
