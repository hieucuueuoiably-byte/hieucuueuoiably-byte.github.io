import fs from 'node:fs'

const file=process.argv[2]
if(!file)throw new Error('Usage: node scripts/verify-home-grounding.mjs <browser-capture.json>')
const captures=JSON.parse(fs.readFileSync(file,'utf8'))
let failures=0
for(const capture of captures){
  const data=capture.data,level=Number(data.homeGroundLevel),contacts=JSON.parse(data.homeGroundContacts)
  for(const contact of contacts){
    const gap=contact.world[1]-level
    const pass=Number.isFinite(gap)&&Math.abs(gap)<.75
    console.log(`${pass?'PASS':'FAIL'} ${capture.label} ${contact.name}: foot/ground gap ${gap.toFixed(3)} world units`)
    if(!pass)failures++
    if(data.homeGroundShadows){
      const shadow=JSON.parse(data.homeGroundShadows).find(s=>s.name===contact.name)
      const distance=shadow?Math.hypot(...contact.world.map((v,i)=>v-shadow.world[i])):Infinity
      const attached=Number.isFinite(distance)&&distance<.1
      console.log(`${attached?'PASS':'FAIL'} ${capture.label} ${contact.name}: foot/shadow distance ${distance.toFixed(3)}`)
      if(!attached)failures++
    }
  }
  if(contacts.length!==2){console.log(`FAIL ${capture.label}: expected two foreground contacts`);failures++}
}
if(!captures.length)throw new Error('No browser captures supplied')
process.exitCode=failures?1:0
