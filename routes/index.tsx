import { Head } from "$fresh/runtime.ts";
import LEDPatternDesigner from "../islands/LEDPatternDesigner.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>Glowstick LED Pattern Designer</title>
      </Head>
      <main>
        <LEDPatternDesigner />
      </main>
    </>
  );
}