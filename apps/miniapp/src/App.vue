<script setup lang="ts">
import { useAccount } from "./stores/account";
import { onShow } from "@dcloudio/uni-app";
onShow(() => { void useAccount().resume(); });
</script>
<style lang="scss">
@use "./styles/tokens.scss";
</style>
