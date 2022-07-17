import { useState,useEffect, useRef } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { customProtocol } from "./protocol/protocol";
import { useImmer } from 'use-immer';

function App() {
  const [count, setCount] = useState(0)
  const videoCanvasRef = useRef(null)
  const subCanvasRef = useRef(null)
  const videoRef = useRef(null)
  const snapshotRef = useRef(null)
  const maxId = useRef(0)
  const [subs, setSubs] = useImmer([])
  const animationFrameId = useRef(null)

  function drawSubtitle(canvas, ctx, sub){
    ctx.font = "60px Ariel"
    const text = sub.translation===''? sub.original : sub.translation
    const textMetrics = ctx.measureText(text)
    const textWidth = textMetrics.actualBoundingBoxLeft + textMetrics.actualBoundingBoxRight
    const textMetricsForH = ctx.measureText('Ay안녕하세요pT')
    const textHeight = textMetricsForH.actualBoundingBoxAscent + textMetricsForH.actualBoundingBoxDescent

    const bgPaddingW = 80
    const bgWidth = textWidth + bgPaddingW
    const bgX = canvas.width/2- textWidth/2 - textMetrics.actualBoundingBoxLeft - bgPaddingW /2
    const paddingY = canvas.height * 0.8

    const bgPaddingH = 20
    const bgHeight = textHeight + bgPaddingH
    const bgY = paddingY - bgPaddingH /2

    ctx.fillStyle = "#000000"
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight)



    ctx.fillStyle="#ffffff"
    ctx.fillText(text,canvas.width/2- textWidth/2 ,textMetricsForH.actualBoundingBoxAscent + paddingY)
  }

  useEffect(() => {
    const videoCanvas = videoCanvasRef.current
    const subCanvas = subCanvasRef.current
    const videoCtx = videoCanvas.getContext("2d")
    const subCtx = subCanvas.getContext("2d")
    if(videoCanvas.current===null || videoCtx===null) return

    function draw(){
      videoCtx.drawImage(videoRef.current,0,0)
      // videoCtx.fillStyle = "#00FF00"
      // videoCtx.fillRect(0,0,1000,1000)
      // videoCtx.fillStyle = "#FF0000"
      // videoCtx.fillRect(0,0,800,800)

      subCtx.clearRect(0,0, subCanvasRef.current.width, subCanvasRef.current.height)
      if(subs.length>0){
       const curSub =  subs.filter((sub)=>sub.start <= videoRef.current.currentTime && sub.end >=  videoRef.current.currentTime)[0]


        if(curSub!==undefined){
          drawSubtitle(subCanvas, subCtx,curSub)
        }
      } 

      animationFrameId.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }
  }, [subs])
  

  async function handleOnFileOpen(){
    const filePath = await window.electron.openFile()
    videoRef.current.src = `${customProtocol}${filePath}`
  }

  async function handleOnRender(){
    const canvas = document.createElement("canvas")
    canvas.width = subCanvasRef.current.width
    canvas.height =  subCanvasRef.current.height
    const ctx = canvas.getContext('2d')

    console.log("W:", canvas.width,"H:",canvas.height);

    const data = await Promise.all(subs.map(async (sub)=>{
      drawSubtitle(subCanvasRef.current, ctx,sub)
      
      snapshotRef.current.src = canvas.toDataURL()

      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      snapshotRef.current.src = URL.createObjectURL(blob, {type:"image/png"})
  
      const buffer = await blob.arrayBuffer()

      return {buffer: buffer, start: sub.start, end: sub.end}
    }))

    window.electron.render(data)
  }

  async function handleOnSnapShot(){
    const canvas = videoCanvasRef.current

    // const buffer = canvas.getContext('2d').getImageData(0,0,500, 500).data.buffer
    // canvas.toDataURL()
    // window.electron.saveImage(buffer)

    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    snapshotRef.current.src = URL.createObjectURL(blob, {type:"image/png"})

    const buffer = await blob.arrayBuffer()
    window.electron.saveImage(buffer)

    // console.log("DataURL:", blob);

    // const objectURL = Buffer.from()

    // window.electron.saveImage(objectURL)
  }

  function handleOnSubAdd(){
    const newSub = {
      id: maxId.current+1,
      start: 0,
      end: 0,
      original:"",
      translation:"",
    }

    maxId.current++

    setSubs(draft => {draft.push(newSub)})
  }

  function onSubDeleted(id){
    setSubs(draft => draft.filter(sub=>sub.id!=id))
  }

  function handleOnSubInfoChange(id){
    return (ev) =>{
        const {name, value} = ev.target

        setSubs(draft => {draft.some(sub=>{
          if(sub.id==id) {
            sub[name] = value
            return true
          }
        })})
    } 
  }

  return (
    <div className="App">
      <button onClick={handleOnFileOpen}>Open File</button>
      <button onClick={handleOnRender}>Render</button>
      <button onClick={handleOnSnapShot}>Capture</button>
      <div style={{display:"flex"}}>
        <video controls ref={videoRef} width={1920/4} height={1080/4}></video>
        <div style={{position:"relative"}}>
          <canvas ref={videoCanvasRef} style={{width: 1920/4, height:1080/4, position:"absolute"}} width={1920} height={1080}/>
          <canvas ref={subCanvasRef} style={{width: 1920/4, height:1080/4, position:"relative"}} width={1920} height={1080}/>
        </div>
        <img ref={snapshotRef} />
      </div>
      <div>
        <h1>Subtitles</h1>
        <div>
          <button onClick={handleOnSubAdd}>+</button>
        </div>
        <div>
        {subs.length>0&&subs.map((sub)=><div key={sub.id}>
          <div>
          <input type="number" step={0.01} name="start" onChange={handleOnSubInfoChange(sub.id)} value={sub.start} />
          <span>~</span>
          <input type="number" step={0.01} name="end" onChange={handleOnSubInfoChange(sub.id)} value={sub.end} />
          </div>
          <input type="text" name="original" onChange={handleOnSubInfoChange(sub.id)} value={sub.original} />
          <input type="text" name="translation" onChange={handleOnSubInfoChange(sub.id)} value={sub.translation}/>
          <button onClick={()=>onSubDeleted(sub.id)}>-</button>
        </div>)}
      </div>
      </div>
      <button onClick={()=>console.dir(subs)}>Show Sub Data</button>
    </div>
  )
}

export default App
