import { createRoot } from './dom'
import { useEffect, useState } from './hooks'
import { jsx } from './jsx-runtime/jsx'

const root = createRoot(document.body)

const App = () => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + 1)
    }, 1000)
    return () => clearInterval(timer)
  })
  return jsx('div', { children: jsx('div', { children: `${count}` }) })
}

root.render(jsx(App, {}))
