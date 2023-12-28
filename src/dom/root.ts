/// <reference lib="dom" />

import { startAndSetInnerContext, endAndResetInnerContext } from '../hooks'
import type { NodeInnerContext, Context } from '../hooks'
import type { VNode, ComponentReturnType } from '../jsx-runtime/jsx'

const initContext = (
  pin: () => void,
  parent: Element,
  after: Comment,
): Context => ({ pin, parent, after, prev: null })

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

export const createRootImpl =
  (document: Document) => (rootElement: Element) => {
    // eslint-disable-next-line complexity
    const renderChildren = (ctx: Context, node: ComponentReturnType): void => {
      if ('object' !== typeof node || !node) {
        const text = getText(node)
        const hash = JSON.stringify(text)
        if ('lit' === ctx.prev?.type && hash === ctx.prev.hash) return
        ctx.prev?.clean()
        if (null === text) {
          ctx.prev = null
          return
        }
        const n = document.createTextNode(`${node}`)
        const { parent, after } = ctx
        const clean = () => parent.removeChild(n)
        ctx.prev = { type: 'lit', clean, hash }
        parent.insertBefore(n, after)
        return
      }
      if ('string' === typeof node.type) {
        const hash = node.type
        let n: HTMLElement
        let prevAttrs: { [k: string]: any } | undefined
        let items: Context[]
        if ('html' === ctx.prev?.type && hash === ctx.prev.tag) {
          n = ctx.prev.element
          prevAttrs = ctx.prev.attrs
          items = ctx.prev.children
        } else {
          ctx.prev?.clean()
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
            type: 'html',
            clean,
            tag: hash,
            element: n,
            attrs: node.props,
            children: items,
          } as const
          ctx.prev = prev
        }
        const { children, ...rest } = node.props || {}
        ctx.prev.attrs = rest
        const nextItems =
          null == children
            ? []
            : Array.isArray(children)
              ? children
              : [children]
        if (nextItems.length < items.length)
          for (const c of items.slice(nextItems.length)) {
            c.prev?.clean()
            n.removeChild(c.after)
          }
        const contexts = []
        for (const [i, c] of nextItems.entries()) {
          const ctx2 = (contexts[i] = (() => {
            if (items[i]) return items[i]!
            const pin = () => {
              renderChildren(cx, cx.current)
            }
            const after = document.createComment(`${i}`)
            n.appendChild(after)
            const cx = initContext(pin, n, after)
            return cx
          })())
          ctx2.current = c
          ctx2.pin()
        }
        ctx.prev.children = contexts
        const setAttribute = (k: string, v: any) => {
          if (prevAttrs?.[k]) removeAttribute(k)
          if ('function' === typeof v)
            // @ts-expect-error: ignore
            n[k.toLowerCase()] = v
          else n.setAttribute(k, `${v as string}`)
        }
        const removeAttribute = (k: string) => {
          const p = prevAttrs?.[k]
          if ('function' === typeof p)
            // @ts-expect-error: ignore
            n[k.toLowerCase()] = undefined
          else n.removeAttribute(k)
        }
        for (const [k, v] of Object.entries(rest)) {
          if (prevAttrs?.[k] === v) continue
          if (v || 0 === v) setAttribute(k, v)
          else removeAttribute(k)
        }
        if (prevAttrs)
          for (const k in prevAttrs) if (!(k in rest)) removeAttribute(k)
        return
      } else {
        const hash = JSON.stringify(
          Object.entries(node.props).sort((q, w) => q[0].localeCompare(w[0])),
        )
        let prevHash: string | null
        let ctx2: Context
        let start2: Comment
        let after2: Comment
        const { type, key, props } = node
        if (
          'node' === ctx.prev?.type &&
          type === ctx.prev.is.type &&
          key === ctx.prev.is.key
        ) {
          prevHash = ctx.prev.propHash
          start2 = ctx.prev.mark[0]
          after2 = ctx.prev.mark[1]
          ctx2 = ctx.prev.ctx
        } else {
          ctx.prev?.clean()
          prevHash = null
          const { parent, after } = ctx
          start2 = document.createComment(`${type.name}:s`)
          parent.insertBefore(start2, after)
          after2 = document.createComment(`${type.name}:e`)
          parent.insertBefore(after2, after)
          const clean = () => {
            for (const f of nodeInnerCtx.onCleanup) f()
            ctx2.prev?.clean()
            parent.removeChild(start2)
            parent.removeChild(after2)
          }
          const pin = () => {
            let ret: ComponentReturnType
            try {
              startAndSetInnerContext(nodeInnerCtx)
              ret = type(props)
            } finally {
              endAndResetInnerContext()
            }
            if (ret) {
              renderChildren(ctx2, ret)
              for (const f of effects) {
                f()
                effects.delete(f)
              }
              return
            }
            ctx2.prev?.clean()
          }
          ctx2 = initContext(pin, parent, after2)
          const effects = new Set<() => void>()
          const nodeInnerCtx: NodeInnerContext = {
            pin,
            effects,
            onCleanup: new Set(),
            refs: [],
          }
          ctx.prev = {
            type: 'node',
            clean,
            is: node,
            propHash: hash,
            mark: [start2, after2],
            ctx: ctx2,
            nodeInnerCtx,
          }
        }
        if (prevHash === hash) return
        return ctx2.pin()
      }
    }
    const rerenderRoot = () => {
      if (prev) renderChildren(rootCtx, prev)
    }
    rootElement.innerHTML = ''
    const after = document.createComment('root')
    rootElement.appendChild(after)
    const rootCtx = initContext(rerenderRoot, rootElement, after)
    let prev: VNode<any> | null = null
    const render = (node: VNode<any>) => {
      renderChildren(rootCtx, (prev = node))
    }
    const unmount = () => {
      rootCtx.prev?.clean()
      rootElement.removeChild(after)
    }
    return { render, unmount }
  }

export const createRoot =
  'undefined' !== typeof document
    ? createRootImpl(document)
    : () => {
        throw new Error('no document')
      }
