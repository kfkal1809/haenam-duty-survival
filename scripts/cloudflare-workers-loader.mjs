const mockSource = "export const env = globalThis.__CLOUDFLARE_WORKERS_ENV__ ?? {};";
const mockUrl = `data:text/javascript,${encodeURIComponent(mockSource)}`;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") {
    return { url: mockUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
