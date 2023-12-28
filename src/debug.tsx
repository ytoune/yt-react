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
  return jsx('div', {
    children: [
      jsx('p', { children: `${count}` }),
      jsx('button', { onClick: () => setCount(c => c + 1), children: 'add' }),
      jsx('button', { onClick: () => setCount(0), children: 'reset' }),
    ],
  })
}

root.render(jsx(App, {}))
