/// <reference lib="dom" />

import { startAndSetInnerContext, endAndResetInnerContext } from '../hooks'
import type { NodeInnerContext, NodeContext, Provided } from '../hooks'
import type { VNode, ComponentReturnType } from '../jsx-runtime/jsx'

interface InnerNode {
  update: () => boolean
}
interface Runner {
  add: (ctx: InnerNode) => void
}

const createInitContext =
  (runner: Runner) =>
  (
    update: () => boolean,
    parent: Element,
    after: Comment,
    provided: Provided,
  ): NodeContext => {
    const pin = () => {
      runner.add(ctx)
    }
    const ctx = {
      pin,
      update,
      parent,
      after,
      prev: null,
      provided,
    } satisfies NodeContext
    return ctx
  }

const getText = (node: string | null): string | null => {
  switch (typeof node) {
    case 'bigint':
    case 'number':
    case 'string':
      return `${node}`
    case 'function':
    case 'symbol':
      return Object.prototype.toString.call(node)
  }
  return null
}

const isArray: (v: unknown) => v is readonly unknown[] = Array.isArray
const hasKey = <T>(v: T): v is T & { readonly key: unknown } =>
  undefined !== (v as any)?.key

const validHasKeyItems = (v: readonly unknown[]) => {
  const set = new Set()
  for (const t of v)
    if (hasKey(t)) {
      if (set.has(t.key)) return false
      set.add(t.key)
    }
  return true
}

const isRefObject = (v: any): v is { current: any } => !!(v && 'current' in v)

export const createRootImpl =
  (document: Document, runner: Runner) => (rootElement: Element) => {
    const renderNode = (
      ctx: NodeContext,
      node: ComponentReturnType,
    ): boolean => {
      if ('object' !== typeof node || !node) return renderPrimitive(ctx, node)
      if (isArray(node)) return renderArray(ctx, node)
      if ('string' === typeof node.type) return renderHTMLElement(ctx, node)
      return renderComponent(ctx, node)
    }
    const renderPrimitive = (
      ctx: NodeContext,
      node: string | null,
    ): boolean => {
      const text = getText(node)
      if ('prm' === ctx.prev?.type && text === ctx.prev.text) return false
      ctx.prev?.clean()
      if (null === text) {
        ctx.prev = null
        return true
      }
      const n = document.createTextNode(`${node}`)
      const { parent, after } = ctx
      const clean = () => parent.removeChild(n)
      ctx.prev = { type: 'prm', clean, text }
      parent.insertBefore(n, after)
      return true
    }
    const renderArray = (
      ctx: NodeContext,
      node: readonly unknown[],
    ): boolean => {
      let updated = false
      if ('ary' === ctx.prev?.type) {
        // ok
      } else {
        ctx.prev?.clean()
        updated = true
        const { parent, after } = ctx
        const clean = () => {
          for (const [p, m] of prev.items) {
            p.prev?.clean()
            parent.removeChild(p.after)
            parent.removeChild(m)
          }
          const [start, end] = prev.mark
          parent.removeChild(start)
          parent.removeChild(end)
        }
        const start = document.createComment('a.s')
        parent.insertBefore(start, after)
        const end = document.createComment('a.e')
        parent.insertBefore(end, after)
        const prev = {
          type: 'ary',
          clean,
          items: [] as [NodeContext, Comment][],
          mark: [start, end],
        } satisfies NodeContext['prev']
        ctx.prev = prev
      }
      const { parent } = ctx
      const [start, after] = ctx.prev.mark
      const prevItems = ctx.prev.items
      const nextItems: (readonly [NodeContext, Comment])[] = []
      const isValid = validHasKeyItems(node)
      const needKeys = new Set(node.filter(hasKey).map(v => v.key))
      const map = new Map<any, [NodeContext, Node[]]>()
      for (const [i, [v, a]] of prevItems.entries())
        if (hasKey(v.prev) && needKeys.has(v.prev.key)) {
          const s = prevItems[i - 1]?.[1] ?? start
          const nodes: Node[] = []
          for (let t: Node | null = s; (t = t.nextSibling) && t !== a; )
            nodes.push(t)
          map.set(v.prev.key, [v, nodes])
        } else {
          v.prev?.clean()
          parent.removeChild(v.after)
          updated = true
        }
      for (const [i, c] of node.entries()) {
        const key = isValid && hasKey(c) ? c.key : undefined
        let mk2 = prevItems[i]?.[1]
        if (!mk2) {
          mk2 = document.createComment(`i${i}`)
          parent.insertBefore(mk2, after)
        }
        const [ctx2, nodes] = (() => {
          if (map.has(key)) return map.get(key)!
          updated = true
          const update = () => renderNode(ctx2, ctx2.current)
          const af2 = document.createComment(`${(key as string) ?? '?'}`)
          parent.insertBefore(af2, mk2)
          const ctx2 = initContext(update, parent, af2, ctx.provided)
          return [ctx2, null] as const
        })()
        const orderChanged =
          undefined !== key && prevItems[i]?.[0]?.current?.key !== key
        if (orderChanged && nodes)
          for (const n of nodes) parent.insertBefore(n, mk2)
        ctx2.current = c
        updated = ctx2.update() || updated || orderChanged
        nextItems.push([ctx2, mk2])
      }
      if (nextItems.length < prevItems.length)
        for (const [, m] of prevItems.slice(nextItems.length))
          parent.removeChild(m)
      ctx.prev.items = nextItems
      return updated
    }
    // eslint-disable-next-line complexity
    const renderHTMLElement = (
      ctx: NodeContext,
      node: VNode<any> & { type: string },
    ): boolean => {
      let updated = false
      const hash = node.type
      let n: HTMLElement
      let prevAttrs: { [k: string]: any } | undefined
      let items: readonly NodeContext[]
      const { children, key, ...rest } = node.props || {}
      if (
        'elm' === ctx.prev?.type &&
        hash === ctx.prev.tag &&
        key === ctx.prev.key
      ) {
        n = ctx.prev.element
        prevAttrs = ctx.prev.attrs
        items = ctx.prev.children
      } else {
        ctx.prev?.clean()
        updated = true
        const { parent, after } = ctx
        n = document.createElement(node.type)
        parent.insertBefore(n, after)
        items = []
        const clean = () => {
          for (const p of prev.children) {
            p.prev?.clean()
            n.removeChild(p.after)
          }
          parent.removeChild(n)
        }
        const prev = {
          type: 'elm',
          clean,
          key,
          tag: hash,
          element: n,
          attrs: rest,
          children: items,
        } satisfies NodeContext['prev']
        ctx.prev = prev
      }
      ctx.prev.attrs = rest
      const nextItems =
        null == children ? [] : Array.isArray(children) ? children : [children]
      if (nextItems.length < items.length) {
        for (const c of items.slice(nextItems.length)) {
          c.prev?.clean()
          n.removeChild(c.after)
        }
        updated = true
      }
      const contexts = []
      for (const [i, c] of nextItems.entries()) {
        const ctx2 = (contexts[i] = (() => {
          if (items[i]) return items[i]!
          const update = () => renderNode(cx, cx.current)
          const after = document.createComment(`${i}`)
          n.appendChild(after)
          const cx = initContext(update, n, after, ctx.provided)
          return cx
        })())
        ctx2.current = c
        updated = ctx2.update() || updated
      }
      ctx.prev.children = contexts
      const setAttribute = (k: string, v: any) => {
        updated = true
        if (prevAttrs?.[k]) removeAttribute(k)
        if ('function' === typeof v)
          // @ts-expect-error: ignore
          n[k.toLowerCase()] = v
        else n.setAttribute(k, `${v as string}`)
      }
      const removeAttribute = (k: string) => {
        updated = true
        const p = prevAttrs?.[k]
        if ('function' === typeof p)
          // @ts-expect-error: ignore
          n[k.toLowerCase()] = undefined
        else n.removeAttribute(k)
      }
      for (const [k, v] of Object.entries(rest)) {
        if (prevAttrs?.[k] === v) continue
        if ('ref' === k) {
          if ('function' === typeof v) v(n)
          else if (isRefObject(v)) v.current = n
          continue
        }
        if (v || 0 === v) setAttribute(k, v)
        else removeAttribute(k)
      }
      if (prevAttrs)
        for (const k in prevAttrs) if (!(k in rest)) removeAttribute(k)
      return updated
    }
    const renderComponent = (
      ctx: NodeContext,
      node: VNode<any> & { type: (p: any) => ComponentReturnType },
    ): boolean => {
      let updated = false
      const hash = Object.entries(node.props)
        .filter(q => undefined !== q[1])
        .sort((q, w) => (q[0] === w[0] ? 0 : q[0] < w[0] ? -1 : 1))
      let prevHash: readonly (readonly [string, any])[] | null
      let ctx2: NodeContext
      const { type: comp, key, props } = node
      if (
        'cmp' === ctx.prev?.type &&
        comp === ctx.prev.comp &&
        key === ctx.prev.key
      ) {
        prevHash = ctx.prev.propHash
        ctx2 = ctx.prev.ctx
        ctx.prev.props = props
        ctx.prev.propHash = hash
      } else {
        ctx.prev?.clean()
        updated = true
        prevHash = null
        const { parent, after } = ctx
        const after2 = document.createComment(`${comp.name}`)
        parent.insertBefore(after2, after)
        const clean = () => {
          for (const f of nodeInnerCtx.onCleanup) f()
          ctx2.prev?.clean()
          parent.removeChild(after2)
        }
        const update = (): boolean => {
          let ret: ComponentReturnType
          try {
            startAndSetInnerContext(nodeInnerCtx)
            const { ref, ...props } = prev.props
            ret = comp(props)
            if ('function' === typeof ref) ref(ret)
            else if (isRefObject(ref)) ref.current = ret
          } finally {
            endAndResetInnerContext()
          }
          if (ret) {
            const r = renderNode(ctx2, ret)
            for (const f of effects) {
              f()
              effects.delete(f)
            }
            return r
          }
          if (ctx2.prev) {
            ctx2.prev?.clean()
            return true
          }
          return false
        }
        const provided: Provided = {
          parent: ctx.provided,
        }
        ctx2 = initContext(update, parent, after2, provided)
        const effects = new Set<() => void>()
        const nodeInnerCtx: NodeInnerContext = {
          pin: update,
          effects,
          onCleanup: new Set(),
          refs: [],
          provided,
        }
        const prev = {
          type: 'cmp',
          clean,
          comp,
          key,
          props,
          propHash: hash,
          ctx: ctx2,
          nodeInnerCtx,
        } satisfies NodeContext['prev']
        ctx.prev = prev
      }
      const needsUpdate =
        !prevHash ||
        prevHash.length !== hash.length ||
        prevHash.some(([k, v], i) => k !== hash[i]![0] || v !== hash[i]![1])
      return (needsUpdate && ctx2.update()) || updated
    }
    const rerenderRoot = () => (prev ? renderNode(rootCtx, prev) : false)
    const initContext = createInitContext(runner)
    rootElement.innerHTML = ''
    const after = document.createComment('root')
    rootElement.appendChild(after)
    const globalProvided: Provided = {
      parent: null,
    }
    const rootCtx = initContext(
      rerenderRoot,
      rootElement,
      after,
      globalProvided,
    )
    let prev: VNode<any> | null = null
    const render = (node: VNode<any>) => {
      renderNode(rootCtx, (prev = node))
    }
    const unmount = () => {
      rootCtx.prev?.clean()
      rootElement.removeChild(after)
    }
    return { render, unmount }
  }

const defaultRunner = (): Runner => {
  const needsUpdating = new Set<InnerNode>()
  const runner = {
    add: (ctx: InnerNode) => {
      needsUpdating.size ||
        setTimeout(() => {
          for (const ctx of needsUpdating) ctx.update()
          needsUpdating.clear()
        })
      needsUpdating.add(ctx)
    },
  } satisfies Runner
  return runner
}

export const createRoot =
  'undefined' !== typeof document
    ? createRootImpl(document, defaultRunner())
    : () => {
        throw new Error('no document')
      }
