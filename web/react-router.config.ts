import type { Config } from "@react-router/dev/config"

export default {
  // SPA. Mockup ini datanya statis dan tidak punya backend, jadi SSR cuma
  // menambah runtime server tanpa manfaat. Dengan `false` hasil build jadi
  // statis dan bisa ditaruh di hosting apa pun — client dapat URL untuk
  // diklik sendiri sebelum meeting, bukan screenshare localhost.
  ssr: false,
} satisfies Config
