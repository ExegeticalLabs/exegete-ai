import { createHmac } from 'crypto'
export class HmacDRBG {
  private key: Buffer; private counter = 0
  constructor(seed: Buffer){ this.key = seed }
  nextBytes(n: number){
    const out = Buffer.alloc(n)
    let produced = 0
    while(produced < n){
      const h = createHmac('sha256', this.key).update(Buffer.from(String(this.counter++))).digest()
      const take = Math.min(h.length, n - produced)
      h.copy(out, produced, 0, take)
      produced += take
    }
    return new Uint8Array(out)
  }
}
