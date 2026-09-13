<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

defineEmits<{ start: [] }>()

const { t } = useI18n()
</script>

<template>
  <div class="overlay">
    <div class="card">
      <p class="tagline">{{ t('tagline') }}</p>

      <h2 class="card__heading">{{ t('howToTitle') }}</h2>
      <ol class="steps">
        <li>{{ t('howTo1') }}</li>
        <li>{{ t('howTo2') }}</li>
        <li>{{ t('howTo3') }}</li>
      </ol>

      <button class="primary" type="button" @click="$emit('start')">{{ t('start') }}</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(8 8 10 / 82%);
  backdrop-filter: blur(6px);
  animation: fade 220ms var(--ease-out);
}

.card {
  width: min(92vw, 400px);
  padding: clamp(20px, 5vw, 28px);
  border: 1px solid var(--line);
  border-radius: var(--radius-panel);
  background: var(--panel);
  box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
}

.tagline {
  margin: 0 0 20px;
  color: var(--accent);
  font-size: clamp(15px, 4vw, 17px);
  font-weight: 600;
  line-height: 1.5;
}

.card__heading {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.steps {
  margin: 0 0 24px;
  padding-left: 20px;
  color: #cfcfd6;
  font-size: 14px;
  line-height: 1.65;
}

.steps li + li {
  margin-top: 7px;
}

.primary {
  width: 100%;
  padding: 13px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(160deg, var(--accent), var(--accent-deep));
  color: #1d1503;
  font-size: 15px;
  font-weight: 700;
  transition: transform 160ms var(--ease-out);
}

.primary:active {
  transform: scale(0.97);
}

@keyframes fade {
  from {
    opacity: 0;
  }
}
</style>
