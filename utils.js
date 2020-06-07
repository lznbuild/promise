const isArray = validateType('Array')
const isObject = validateType('Object')
const isFunction = validateType('Function')

function validateType(type) {
    return function (source) {
        return Object.prototype.toString.call(source) === `[object ${type}]`
    }
}

function isPromise(source) {
    return source && isObject(source) && isFunction(source.then)
}

function runResolvePromiseWithErrorCapture(promise, onFulfilledOrOnRejected, resolve, reject, valueOrReason) {
    try {
        //捕获then中的异常
        resolvePromise(promise, onFulfilledOrOnRejected(valueOrReason), resolve, reject)
    } catch (e) {
        reject(e)
    }
}

function resolvePromise(promise, x, resolve, reject) {
    // 保证then方法的链式调用不会出执行顺序问题
    if (promise === x) {
        return reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
    }

    // 避免反复调用
    // 规范中明确表示: If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored. 因此我们需要这样的flag来确保只会执行一次。

    let called = false

    if (x && (isObject(x) || isFunction(x))) {
        try {
            let then = x.then
            // 判断x是否是Promise实例
            if (isFunction(then)) {
                then.call(
                    x,
                    y => {
                        if (called) return
                        called = true
                        // 继续走then后面的then，递归此过程
                        resolvePromise(promise, y, resolve, reject)
                    },
                    r => {
                        if (called) return
                        called = true

                        reject(r)
                    }
                )
            } else {
                resolve(x)
            }
        } catch (err) {
            if (called) return
            called = true

            reject(err)
        }
    } else {
        resolve(x)
    }
}



module.exports = {
    isArray,
    isObject,
    isPromise,
    isFunction,
    resolvePromise,
    runResolvePromiseWithErrorCapture
}
