import * as jsxRuntime from "react/jsx-runtime";

type MDXContentProps = {
  components?: Record<string, unknown>;
};

export function getMDXComponent(code: string) {
  const fn = new Function("runtime", `${code}`) as (
    runtime: typeof jsxRuntime,
  ) =>
    | ((props: MDXContentProps) => JSX.Element)
    | { default: (props: MDXContentProps) => JSX.Element };

  const moduleOrComponent = fn(jsxRuntime);
  if (typeof moduleOrComponent === "function") {
    return moduleOrComponent;
  }
  return moduleOrComponent.default;
}
