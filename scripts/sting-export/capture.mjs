// Exports the ledwall "sting" transition (src/app/ledwall/page.tsx +
// globals.css keyframes, mirrored in ./sting.html) as a transparent WebM
// for use as an OBS Stinger Transition.
//
// Usage: node scripts/sting-export/capture.mjs

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

const WIDTH = 1920
const HEIGHT = 1080
const FPS = 60
const DURATION_MS = 800 // STING_DURATION_MS in src/app/ledwall/page.tsx

const framesDir = path.join(__dirname, 'frames')
const outDir = path.join(repoRoot, 'exports/ledwall-sting')
const outFile = path.join(outDir, 'ledwall-sting.webm')

async function main() {
  await fs.rm(framesDir, { recursive: true, force: true })
  await fs.mkdir(framesDir, { recursive: true })
  await fs.mkdir(outDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  })

  await page.goto('file://' + path.join(__dirname, 'sting.html'))

  // Pause every animation so we can drive them deterministically frame by
  // frame instead of capturing in real time (avoids dropped/duplicated
  // frames under system load).
  await page.evaluate(() => {
    window.__anims = document.getAnimations()
    for (const a of window.__anims) a.pause()
  })

  const totalFrames = Math.round((FPS * DURATION_MS) / 1000)
  console.log(`Capturing ${totalFrames} frames at ${WIDTH}x${HEIGHT}@${FPS}fps...`)

  for (let frame = 0; frame <= totalFrames; frame++) {
    const t = (frame / FPS) * 1000
    await page.evaluate(ms => {
      for (const a of window.__anims) a.currentTime = ms
    }, t)
    const filename = path.join(framesDir, `frame_${String(frame).padStart(4, '0')}.png`)
    await page.screenshot({ path: filename, omitBackground: true })
  }

  await browser.close()

  console.log('Encoding to VP9 alpha WebM...')
  await run('ffmpeg', [
    '-y',
    '-framerate', String(FPS),
    '-i', path.join(framesDir, 'frame_%04d.png'),
    '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuva420p',
    '-auto-alt-ref', '0',
    '-b:v', '0',
    '-crf', '20',
    outFile,
  ])

  await fs.rm(framesDir, { recursive: true, force: true })

  console.log(`Done: ${outFile}`)
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit' })
    proc.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))))
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
