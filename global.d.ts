/// <reference types="react" />
/// <reference types="react-dom" />

// Fallback React module declaration when @types/react is not available
declare module 'react' {
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useContext<T>(context: React.Context<T>): T;
  
  export type ReactNode = JSX.Element | string | number | boolean | null | undefined | ReactNode[];
  export type ReactElement<P = any, T = any> = {
    type: T;
    props: P;
    key: string | number | null;
  };
  
  export type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;
  export type FunctionComponent<P = {}> = (props: P & { children?: ReactNode }) => ReactElement | null;
  export type ComponentClass<P = {}, S = any> = new (props: P) => Component<P, S>;
  
  export class Component<P = {}, S = {}> {
    constructor(props: P);
    props: P;
    state: S;
    render(): ReactNode;
  }
  
  export type FC<P = {}> = FunctionComponent<P>;
  
  export interface Context<T> {
    Provider: ComponentType<{ value: T; children?: ReactNode }>;
    Consumer: ComponentType<{ children: (value: T) => ReactNode }>;
  }
  
  export function createContext<T>(defaultValue: T): Context<T>;
  
  export interface HTMLAttributes<T> {
    className?: string;
    style?: CSSProperties;
    onClick?: (event: MouseEvent<T>) => void;
    [key: string]: any;
  }
  
  export interface CSSProperties {
    [key: string]: any;
  }
  
  export interface MouseEvent<T> {
    [key: string]: any;
  }
  
  export interface DetailedHTMLProps<T, U> extends HTMLAttributes<U> {
    [key: string]: any;
  }
  
  export interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    [key: string]: any;
  }
  
  const React: {
    useState: typeof useState;
    useEffect: typeof useEffect;
    useMemo: typeof useMemo;
    useCallback: typeof useCallback;
    useRef: typeof useRef;
    useContext: typeof useContext;
    Component: typeof Component;
    createContext: typeof createContext;
    FC: typeof FC;
  };
  
  export default React;
}

// JSX namespace definitions
declare global {
  namespace JSX {
    type Element = React.ReactElement<any, any>;
    interface IntrinsicElements {
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
      p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
      button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
      [elemName: string]: any;
    }
    interface ElementClass {
      render(): React.ReactNode;
    }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

export {};
