<script setup lang="ts">
import SerialLogTerm from './SerialLogTerm.vue'
import SerialSend from './SerialSend.vue'
</script>

<template>
  <div class="serial-log">
    <SerialLogTerm class="serial-term"></SerialLogTerm>
    <SerialSend class="serial-send"></SerialSend>
  </div>
</template>

<style scoped>
.serial-log {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.serial-term {
  flex: 1;
}

</style>