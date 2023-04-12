import type {PiniaPluginContext} from 'pinia'

type Store = PiniaPluginContext['store'];
type PartialState = Partial<Store['$state']>;

/**
 * 持久化store（仅适用于uniApp微信小程序）
 * @param strategy
 * @param store
 */
export const updateStorage = (strategy: PersistStrategy, store: Store) => {
    // 小程序版本
    const {miniProgram: {envVersion, version}} = uni.getAccountInfoSync()
    const miniVersion = version ? version : envVersion

    // 默认存储 key 为 store.$id
    const storeKey = strategy.key || store.$id

    // 持久化数据
    const persist = (data: any) => {
        const result = uni.getStorageSync(storeKey)
        // 比较版本
        if (result && result.miniVersion === miniVersion) {
            // 存在则合并
            uni.setStorageSync(storeKey, Object.assign(result, data))
        } else {
            uni.setStorageSync(storeKey, Object.assign(data, {miniVersion}))
        }
    }

    if (strategy.paths) {
        // 遍历 paths 将对应的属性收集到 finalObj 中
        const partialState = strategy.paths.reduce((finalObj, key) => {
            finalObj[key] = store.$state[key]
            return finalObj
        }, {} as PartialState)
        persist(partialState)
    } else {
        // 如果没有 paths，则按整个 store.$state 存储
        persist(store.$state)
    }
}

export default ({options, store}: PiniaPluginContext): void => {
    console.log('pinia-persist插件启用')

    // 判断插件功能是否开启
    if (options.persist?.enabled) {

        // 默认策略实例
        const defaultStrat: PersistStrategy[] = [{
            key: store.$id,
        }]

        const strategies = options.persist?.strategies?.length ? options.persist?.strategies : defaultStrat

        strategies.forEach((strategy: PersistStrategy) => {
            const storeKey = strategy.key || store.$id
            const storageResult = uni.getStorageSync(storeKey)

            if (storageResult) {
                // 如果 storage 中存在同步数据
                store.$patch(storageResult)
                updateStorage(strategy, store)
            }
        })

        // 初始化持久store
        strategies.forEach((strategy: PersistStrategy) => {
            updateStorage(strategy, store)
        })
        // 监听 state 变化，同步更新 storage
        store.$subscribe(() => {
            strategies.forEach((strategy: PersistStrategy) => {
                updateStorage(strategy, store)
            })
        })
    }
}