<script setup lang="ts">
// A plain table of rows already read from a data file; the last column onward is numeric.
defineProps<{ head: string[]; rows: (string | number)[][]; highlight?: string }>();
</script>

<template>
  <div class="data-table">
    <table>
      <thead>
        <tr>
          <th v-for="(h, i) in head" :key="h" :class="{ num: i > 0 }">{{ h }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in rows" :key="i" :class="{ ours: highlight && String(r[0]).startsWith(highlight) }">
          <td v-for="(c, j) in r" :key="j" :class="{ num: j > 0 }">{{ c }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
