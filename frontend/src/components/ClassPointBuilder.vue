<template><ClassBuilderForm :campaign-id="campaignId" :open="open" @created="emit('created', $event)"/></template>
<script setup lang="ts">
import ClassBuilderForm from './ClassBuilderForm.vue'
defineProps<{ campaignId:string; open?:boolean }>()
const emit=defineEmits<{created:[id:string]}>()
</script>
