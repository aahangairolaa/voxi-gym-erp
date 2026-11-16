/** ZKTeco reports command results here. We just acknowledge. */
export async function POST() {
  return new Response("OK", { headers: { "Content-Type": "text/plain" } });
}
