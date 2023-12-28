import { createRoot } from './dom'
import { useEffect, useState } from './hooks'
import type { VNode } from './jsx-runtime/jsx'
import { jsx } from './jsx-runtime/jsx'

const App = () => jsx('div', { class: 'hoge', children: ['fuga1', 'fuga2'] })

const root = createRoot(document.body)

const log = (node: VNode<any>) => {
  root.render(node)
  console.log(document.body.innerHTML)
}

log(jsx(App, {}))
log(jsx('div', { class: 'hoge', children: ['piyo1', 'piyo2'] }))
log(jsx('div', { children: ['piyo1', 'piyo2'] }))
log(jsx('div', { children: jsx('div', { children: 'pp' }) }))
log(jsx('div', { children: 'ok' }))

const App2 = () => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + 1)
    }, 1000)
    return () => clearInterval(timer)
  })
  return jsx('div', { children: jsx('div', { children: `${count}` }) })
}

log(jsx(App2, {}))
