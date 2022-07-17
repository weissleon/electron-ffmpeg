import { useState,useEffect } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
  
    return () => {
      
    }
  }, [])
  

  return (
    <div className="App">
      <button onClick={()=>window.electron.openFile()}>Open File</button>
      <button onClick={()=>window.electron.render()}>Render</button>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="./vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  )
}

export default App
