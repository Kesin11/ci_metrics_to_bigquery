const randRange = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)

describe('dummy1', () => {
  describe('Always success tests', () => {
    it('should be wait 0-2sec', async () => {
      const p = new Promise((resolve) => setTimeout(resolve, randRange(0, 2000)))
      await p
      expect(p).resolves.toBeUndefined()
    })

    it('should be wait 1-3sec', async () => {
      const p = new Promise((resolve) => setTimeout(resolve, randRange(1000, 3000)))
      await p
      expect(p).resolves.toBeUndefined()
    })
  })

  describe('Randomly fail tests', () => {
    it('should be wait 0-1sec and fail 50%', async () => {
      await new Promise((resolve) => setTimeout(resolve, randRange(0, 1000)))
      const r = Math.random() * 100
      expect(r).toBeGreaterThan(50)
    })

    it('should be wait 1-2sec and fail 30%', async () => {
      await new Promise((resolve) => setTimeout(resolve, randRange(1000, 2000)))
      const r = Math.random() * 100
      expect(r).toBeGreaterThan(30)
    })
  })
})