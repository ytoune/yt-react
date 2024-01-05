import { describe, it, expect } from 'vitest'
import { Window } from 'happy-dom'
import { jsx } from '../jsx-runtime/jsx'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  usePin,
  useReducer,
  useRef,
  useState,
} from '../hooks'
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
    add: (ctx: { update: () => boolean }) => {
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

  it('should work with delayed render', () => {
    const { document } = createDocument()
    const store = new Set<{ update: () => boolean }>()
    const runner = {
      add: (ctx: { update: () => boolean }) => {
        store.add(ctx)
      },
    }
    const updateAll = () => {
      for (const ctx of store) {
        ctx.update()
        store.delete(ctx)
      }
    }
    let count = 0
    const originalCreate = document.createTextNode
    document.createTextNode = (text: string) => {
      count += 1
      return originalCreate.call(document, text)
    }
    const root = createRootImpl(document, runner)(document.body)

    let pin: () => void = needSet
    let num = 0
    const App = () => {
      pin = usePin()
      return jsx('div', { children: `${num}` })
    }

    root.render(jsx(App, {}))
    expect(document.body.innerHTML).toBe(
      '<div>0<!--0--></div><!--App--><!--root-->',
    )
    expect(count).toBe(1)
    num = 1
    pin()
    expect(document.body.innerHTML).toBe(
      '<div>0<!--0--></div><!--App--><!--root-->',
    )
    expect(count).toBe(1)
    num = 2
    pin()
    expect(document.body.innerHTML).toBe(
      '<div>0<!--0--></div><!--App--><!--root-->',
    )
    expect(count).toBe(1)
    updateAll()
    expect(document.body.innerHTML).toBe(
      '<div>2<!--0--></div><!--App--><!--root-->',
    )
    expect(count).toBe(2)
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

  it('should work with keyed array', () => {
    const { root, document } = createRoot()

    let pin: () => void = needSet
    let nums = [1, 2, 3, 4]
    let count = 0
    const Child = (p: { no: number }) => {
      count += 1
      return `c${p.no}`
    }
    const child = (no: number) => jsx(Child, { no }, no as unknown as string)
    const App = () => {
      pin = usePin()
      return jsx('div', { children: [nums.map(child)] })
    }
    root.render(jsx(App, {}))
    expect(document.body.innerHTML).toBe(
      '<div><!--a.s-->c1<!--Child--><!--1--><!--i0-->c2<!--Child--><!--2--><!--i1-->c3<!--Child--><!--3--><!--i2-->c4<!--Child--><!--4--><!--i3--><!--a.e--><!--0--></div><!--App--><!--root-->',
    )
    expect(count).toBe(4)
    nums = [1, 2, 4]
    pin()
    expect(document.body.innerHTML).toBe(
      '<div><!--a.s-->c1<!--Child--><!--1--><!--i0-->c2<!--Child--><!--2--><!--i1-->c4<!--Child--><!--4--><!--i2--><!--a.e--><!--0--></div><!--App--><!--root-->',
    )
    expect(count).toBe(4)
    nums = [4, 1, 5]
    pin()
    expect(document.body.innerHTML).toBe(
      '<div><!--a.s-->c4<!--Child--><!--4--><!--i0-->c1<!--Child--><!--1--><!--i1-->c5<!--Child--><!--5--><!--i2--><!--a.e--><!--0--></div><!--App--><!--root-->',
    )
    expect(count).toBe(5)
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

  it('should work with useMemo', () => {
    const { root, document } = createRoot()

    let pin: () => void = needSet
    let num = 0
    let count = 0
    const App = () => {
      pin = usePin()
      const c = useMemo(() => {
        count += 1
        return count
      }, [num])
      return `${c}`
    }
    root.render(jsx(App, {}))
    expect(document.body.innerHTML).toBe('1<!--App--><!--root-->')
    expect(count).toBe(1)
    pin()
    expect(document.body.innerHTML).toBe('1<!--App--><!--root-->')
    expect(count).toBe(1)
    num = 1
    pin()
    expect(document.body.innerHTML).toBe('2<!--App--><!--root-->')
    expect(count).toBe(2)
  })

  it('should work with useCallback', () => {
    const { root, document } = createRoot()

    let pin: () => void = needSet
    let prevCallback: () => number = needSet
    let callback: () => number = needSet
    let num = 0
    let count = 0
    const App = () => {
      pin = usePin()
      callback = useCallback(() => {
        count += 1
        return count
      }, [num])
      return `ok`
    }
    root.render(jsx(App, {}))
    expect(document.body.innerHTML).toBe('ok<!--App--><!--root-->')
    expect(count).toBe(0)
    expect(callback()).toBe(1)
    expect(count).toBe(1)
    prevCallback = callback
    pin()
    expect(callback).toBe(prevCallback)
    expect(document.body.innerHTML).toBe('ok<!--App--><!--root-->')
    expect(count).toBe(1)
    expect(callback()).toBe(2)
    expect(count).toBe(2)
    num = 1
    prevCallback = callback
    pin()
    expect(callback).not.toBe(prevCallback)
    expect(document.body.innerHTML).toBe('ok<!--App--><!--root-->')
    expect(count).toBe(2)
    expect(callback()).toBe(3)
    expect(count).toBe(3)
  })

  it('should work with useReducer', () => {
    const { root, document } = createRoot()

    let dispatch: (a: number) => void = needSet
    let count = 0
    const App = () => {
      const [state, d] = useReducer((s: number, a: number) => s + a, 0)
      dispatch = d
      count += 1
      return `${state},${count}`
    }
    root.render(jsx(App, {}))
    expect(document.body.innerHTML).toBe('0,1<!--App--><!--root-->')
    dispatch(2)
    expect(document.body.innerHTML).toBe('2,2<!--App--><!--root-->')
    dispatch(3)
    expect(document.body.innerHTML).toBe('5,3<!--App--><!--root-->')
  })

  it('should work with useReducer with init', () => {
    const { root, document } = createRoot()

    let dispatch: (a: number) => void = needSet
    let count = 0
    const App = () => {
      const [state, d] = useReducer(
        (s: number, a: number) => s + a,
        0,
        (i: number) => i + 1,
      )
      dispatch = d
      count += 1
      return `${state},${count}`
    }
    root.render(jsx(App, {}))
    expect(document.body.innerHTML).toBe('1,1<!--App--><!--root-->')
    dispatch(2)
    expect(document.body.innerHTML).toBe('3,2<!--App--><!--root-->')
    dispatch(3)
    expect(document.body.innerHTML).toBe('6,3<!--App--><!--root-->')
  })

  it('should work with context', () => {
    const { root, document } = createRoot()

    const ctx = createContext('global')
    const Parent = () =>
      jsx(ctx.Provider, {
        value: 'parent',
        children: jsx(Child, {}),
      })
    const Child = () => {
      const v = useContext(ctx)
      return `${v}`
    }
    const App = () =>
      jsx('div', { children: [jsx(Parent, {}), jsx(Child, {})] })
    root.render(jsx(App, {}))

    expect(document.body.innerHTML).toBe(
      '<div>parent<!--Child--><!--Provider--><!--Parent--><!--0-->global<!--Child--><!--1--></div><!--App--><!--root-->',
    )
  })

  it('should work with ref', () => {
    const { root, document } = createRoot()

    let ref: { current: null | HTMLDivElement } = { current: null }
    const App = () => {
      ref = useRef<HTMLDivElement | null>(null)
      return jsx('div', { ref })
    }
    root.render(jsx(App, {}))
    expect(document.body.innerHTML).toBe('<div></div><!--App--><!--root-->')
    expect(ref.current).toBe(document.body.firstChild)
    expect(ref.current?.tagName).toBe('DIV')

    let count = 0
    let pin: () => void = needSet
    ref = {
      set current(_: any) {
        count += 1
      },
      get current() {
        return null
      },
    }
    expect('current' in ref).toBe(true)
    const App2 = () => {
      pin = usePin()
      return jsx('div', { ref, class: 'hoge' })
    }
    root.render(jsx(App2, {}))
    expect(document.body.innerHTML).toBe(
      '<div class="hoge"></div><!--App2--><!--root-->',
    )
    expect(count).toBe(1)
    pin()
    expect(count).toBe(1)
  })

  it('should work with ref function', () => {
    const { root, document } = createRoot()

    let pin: () => void = needSet
    let count = 0
    let element: any
    const ref = (e: any) => {
      count += 1
      element = e
    }
    const App = () => {
      pin = usePin()
      return jsx('div', { ref })
    }
    root.render(jsx(App, {}))
    expect(document.body.innerHTML).toBe('<div></div><!--App--><!--root-->')
    expect(element).toBe(document.body.firstChild)
    expect(element.tagName).toBe('DIV')
    expect(count).toBe(1)
    pin()
    expect(count).toBe(1)
  })
})
