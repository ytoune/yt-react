import { describe, it, expect } from 'vitest'
import { Window } from 'happy-dom'
import { jsx } from '../jsx-runtime/jsx'
import type { Context } from '../hooks'
import { useEffect, usePin, useState } from '../hooks'
import { createRootImpl } from './root'

const createDocument = () => {
  const window = new Window({
    settings: {
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
      disableComputedStyleRendering: true,
      disableErrorCapturing: true,
    },
  })
  return window as unknown as (typeof globalThis)['window']
}

const createRoot = () => {
  const { document } = createDocument()
  const runner = {
    add: (ctx: Context) => {
      ctx.update()
    },
  }
  const root = createRootImpl(document, runner)(document.body)
  return { root, document } as const
}

const needSet = () => {
  throw new Error('need set')
}

describe('root', () => {
  it('should work', () => {
    const { root, document } = createRoot()

    const App = () =>
      jsx('div', { class: 'hoge', children: ['fuga1', 'fuga2'] })
    root.render(jsx(App, {}))
    expect(document.body.innerHTML).toBe(
      '<div class="hoge">fuga1<!--0-->fuga2<!--1--></div><!--App--><!--root-->',
    )
    root.render(jsx('div', { class: 'hoge', children: ['piyo1', 'piyo2'] }))
    expect(document.body.innerHTML).toBe(
      '<div class="hoge">piyo1<!--0-->piyo2<!--1--></div><!--root-->',
    )
    root.render(jsx('div', { children: ['piyo1', 'piyo2'] }))
    expect(document.body.innerHTML).toBe(
      '<div>piyo1<!--0-->piyo2<!--1--></div><!--root-->',
    )
    root.render(jsx('div', { children: jsx('div', { children: 'pp' }) }))
    expect(document.body.innerHTML).toBe(
      '<div><div>pp<!--0--></div><!--0--></div><!--root-->',
    )
    root.render(jsx('div', { children: 'ok' }))
    expect(document.body.innerHTML).toBe('<div>ok<!--0--></div><!--root-->')
  })

  it('should work with array', () => {
    const { root, document } = createRoot()

    const App = () =>
      jsx('div', { class: 'hoge', children: [['fuga1', 'fuga2']] })
    root.render(jsx(App, {}))
    expect(document.body.innerHTML).toBe(
      '<div class="hoge"><!--a.s-->fuga1<!--?--><!--i0-->fuga2<!--?--><!--i1--><!--a.e--><!--0--></div><!--App--><!--root-->',
    )
    let count = 0
    const Child = (p: { no: number }) => {
      count += 1
      return `c${p.no}`
    }
    const child = (no: number) => jsx(Child, { no }, no as unknown as string)
    root.render(
      jsx('div', {
        class: 'piyo',
        children: [[child(1), child(2)]],
      }),
    )
    expect(document.body.innerHTML).toBe(
      '<div class="piyo"><!--a.s-->c1<!--Child--><!--1--><!--i0-->c2<!--Child--><!--2--><!--i1--><!--a.e--><!--0--></div><!--root-->',
    )
    expect(count).toBe(2)
    root.render(
      jsx('div', {
        class: 'piyo',
        children: [[child(2), child(1)]],
      }),
    )
    expect(count).toBe(2)
    root.render(
      jsx('div', {
        class: 'piyo',
        children: [[child(3), child(1), child(2)]],
      }),
    )
    expect(document.body.innerHTML).toBe(
      '<div class="piyo"><!--a.s-->c3<!--Child--><!--3--><!--i0-->c1<!--Child--><!--1--><!--i1-->c2<!--Child--><!--2--><!--i2--><!--a.e--><!--0--></div><!--root-->',
    )
  })

  it('should work with usePin', () => {
    const { root, document } = createRoot()

    let pin: () => void = needSet
    let num = 0
    const App2 = () => {
      pin = usePin()
      return jsx('div', { children: `${num}` })
    }

    root.render(jsx(App2, {}))
    expect(document.body.innerHTML).toBe(
      '<div>0<!--0--></div><!--App2--><!--root-->',
    )
    num = 1
    pin()
    expect(document.body.innerHTML).toBe(
      '<div>1<!--0--></div><!--App2--><!--root-->',
    )
    num = 2
    pin()
    expect(document.body.innerHTML).toBe(
      '<div>2<!--0--></div><!--App2--><!--root-->',
    )
  })

  it('should work with useEffect', () => {
    const { root, document } = createRoot()

    let pin: () => void = needSet
    let count = 0
    let count2 = 0
    const App3 = () => {
      pin = usePin()
      useEffect(() => {
        count += 1
        return () => {
          count2 += 1
        }
      })
      return jsx('div', { children: `${count},${count2}` })
    }

    root.render(jsx(App3, {}))
    expect(document.body.innerHTML).toBe(
      '<div>0,0<!--0--></div><!--App3--><!--root-->',
    )
    pin()
    expect(document.body.innerHTML).toBe(
      '<div>1,0<!--0--></div><!--App3--><!--root-->',
    )
    pin()
    expect(document.body.innerHTML).toBe(
      '<div>2,1<!--0--></div><!--App3--><!--root-->',
    )
    root.render(jsx('div', {}))
    expect(document.body.innerHTML).toBe('<div></div><!--root-->')
    expect(count).toBe(3)
    expect(count2).toBe(3)
  })

  it('should work with useEffect with deps', () => {
    const { root, document } = createRoot()

    let pin: () => void = needSet
    let num = 0
    let count = 0
    let count2 = 0
    let count3 = 0
    const App4 = () => {
      pin = usePin()
      useEffect(() => {
        count += 1
        return () => {
          count2 += 1
        }
      }, [num])
      useEffect(() => {
        count3 += 1
      }, [])
      return jsx('div', {
        children: [
          `${count},${count2},${count3}`,
          jsx('button', {
            children: 'click',
          }),
        ],
      })
    }

    root.render(jsx(App4, {}))
    expect(document.body.innerHTML).toBe(
      '<div>0,0,0<!--0--><button>click<!--0--></button><!--1--></div><!--App4--><!--root-->',
    )
    pin()
    expect(document.body.innerHTML).toBe(
      '<div>1,0,1<!--0--><button>click<!--0--></button><!--1--></div><!--App4--><!--root-->',
    )
    pin()
    expect(document.body.innerHTML).toBe(
      '<div>1,0,1<!--0--><button>click<!--0--></button><!--1--></div><!--App4--><!--root-->',
    )
    num = 1
    pin()
    expect(document.body.innerHTML).toBe(
      '<div>1,0,1<!--0--><button>click<!--0--></button><!--1--></div><!--App4--><!--root-->',
    )
    expect(count).toBe(2)
    expect(count2).toBe(1)
    expect(count3).toBe(1)
    root.render(jsx('div', {}))
    expect(document.body.innerHTML).toBe('<div></div><!--root-->')
    expect(count).toBe(2)
    expect(count2).toBe(2)
    expect(count3).toBe(1)
  })

  it('should work with useState', () => {
    const { root, document } = createRoot()

    let setNum: (num: number | ((n: number) => number)) => void = needSet
    const App5 = () => {
      const [num, setNum0] = useState(0)
      setNum = setNum0
      return jsx('div', { children: `${num}` })
    }

    root.render(jsx(App5, {}))
    expect(document.body.innerHTML).toBe(
      '<div>0<!--0--></div><!--App5--><!--root-->',
    )
    setNum(1)
    expect(document.body.innerHTML).toBe(
      '<div>1<!--0--></div><!--App5--><!--root-->',
    )
    setNum(2)
    expect(document.body.innerHTML).toBe(
      '<div>2<!--0--></div><!--App5--><!--root-->',
    )
    setNum(v => v + 2)
    expect(document.body.innerHTML).toBe(
      '<div>4<!--0--></div><!--App5--><!--root-->',
    )
  })
})
