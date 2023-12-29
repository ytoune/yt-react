/* eslint-disable @typescript-eslint/no-namespace */
/// <reference lib="dom" />

export namespace JSX {
  export interface IntrinsicAttributes {
    key?: any
  }

  export interface IntrinsicElements {
    div: any
    p: any
    span: any
    form: any
    button: any
    a: any
  }
  export type ElementType<P = any> =
    | {
        [K in keyof IntrinsicElements]: P extends IntrinsicElements[K]
          ? K
          : never
      }[keyof IntrinsicElements]
    | ComponentType<P>
  export type Element = VNode<any>
}

export type VNode<P> =
  | {
      type: keyof JSX.IntrinsicElements
      props: JSX.IntrinsicElements[keyof JSX.IntrinsicElements]
      key?: string
    }
  | {
      type: (p: P) => ComponentReturnType
      props: P
      key?: string
    }
export type ComponentReturnType =
  | null
  | string
  | VNode<any>
  | readonly ComponentReturnType[]

export type ComponentType<P> =
  | keyof JSX.IntrinsicElements
  | ((p: P) => ComponentReturnType)

// export function jsx(
//   type: string,
//   props: JSX.HTMLAttributes &
//     JSX.SVGAttributes &
//     Record<string, any> & { children?: ComponentChild },
//   key?: string,
// ): VNode<any>
// export function jsx<P>(
//   type: ComponentType<P>,
//   props: Attributes & P & { children?: ComponentChild },
//   key?: string,
// ): VNode<any>

// export function jsxs(
//   type: string,
//   props: JSX.HTMLAttributes &
//     JSX.SVGAttributes &
//     Record<string, any> & { children?: ComponentChild[] },
//   key?: string,
// ): VNode<any>
// export function jsxs<P>(
//   type: ComponentType<P>,
//   props: Attributes & P & { children?: ComponentChild[] },
//   key?: string,
// ): VNode<any>

export const jsx = <P>(
  type: ComponentType<P>,
  props: P,
  key?: string,
): VNode<P> => ({
  type,
  props,
  key,
})

export const jsxs = <P>(
  type: ComponentType<P>,
  props: P,
  key?: string,
): VNode<P> => ({
  type,
  props,
  key,
})
