export const asyncDelay = async(time: number) => {
  const p = new Promise(function(resolve) {
    setTimeout(() => {
      resolve('done!')
    }, time)
  })
  return await p
}