<template>
  <div class="timeline-page">
    <v-container fluid class="timeline-container">
      <div class="timeline-header">
        <div>
          <div class="timeline-kicker">HISTORY ARCHIVE</div>
          <h1>Degenesis Timeline</h1>
          <p>
            <strong>Note:</strong> Very few people are aware of the history prior to, during, and even after the Eshaton, especially in regards to Recombination Group, Project Tannhäuser and Sleepers. It is best to assume ignorance and ask your Gamemaster if your character knows a particular piece of information.
          </p>
        </div>
        <div class="timeline-stat">
          <span>{{ visibleEvents.length }}</span>
          <small>VISIBLE EVENTS</small>
        </div>
      </div>

      <v-card class="timeline-controls" variant="tonal">
        <v-card-text>
          <div class="filter-heading">
            <div class="control-copy">
              <strong>Filter the archive</strong>
              <span>Leave a filter empty to include all values in that category.</span>
            </div>
            <v-btn
              v-if="hasActiveFilters"
              size="small"
              variant="text"
              class="clear-filter-button"
              @click="clearFilters"
            >
              Clear filters
            </v-btn>
          </div>

          <div class="filter-grid">
            <v-text-field
              v-model="searchQuery"
              label="Search events"
              placeholder="Search titles, descriptions, Cults, regions..."
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />

            <v-select
              v-model="selectedArchives"
              :items="archiveOptions"
              label="Archive"
              variant="outlined"
              density="compact"
              multiple
              chips
              closable-chips
              clearable
              hide-details
            />

            <v-select
              v-model="selectedSources"
              :items="sourceOptions"
              label="Source"
              variant="outlined"
              density="compact"
              multiple
              chips
              closable-chips
              clearable
              hide-details
            />

            <v-select
              v-model="selectedCults"
              :items="cultOptions"
              label="Cult"
              variant="outlined"
              density="compact"
              multiple
              chips
              closable-chips
              clearable
              hide-details
            />

            <v-select
              v-model="selectedRegions"
              :items="regionOptions"
              label="Region"
              variant="outlined"
              density="compact"
              multiple
              chips
              closable-chips
              clearable
              hide-details
            />
          </div>
        </v-card-text>
      </v-card>

      <div class="source-key">
        <span class="source-key-item general-key">
          <i></i> Canon
        </span>
        <span class="source-key-item spitalian-key">
          <i></i> Spitalian Archives
        </span>
        <span class="source-key-note">Source: KatharSys</span>
      </div>

      <div class="timeline-workspace">
        <div class="timeline-left">
          <div class="timeline-frame">
            <div class="timeline-column-head">
              <span>YEAR</span>
              <strong>CHRONOLOGY</strong>
              <small>Distance represents elapsed time<br />Select a marker for details</small>
            </div>

            <div class="timeline-vertical-canvas" :style="canvasStyle">
              <div class="axis-centerline"></div>

              <div
                v-for="year in axisYears"
                :key="`axis-${year}`"
                class="year-tick"
                :class="{ major: year % 50 === 0 }"
                :style="positionStyle(year)"
              >
                <span>{{ year }}</span>
              </div>

              <button
                v-for="event in visibleEvents"
                :id="`timeline-${event.id}`"
                :key="event.id"
                type="button"
                class="event-marker"
                :class="markerClasses(event)"
                :style="markerStyle(event)"
                :aria-label="`${event.year}: ${event.title}`"
                @click="selectEvent(event)"
              >
                <span class="marker-dot"></span>
                <span class="marker-label">
                  <strong>{{ event.year }} · {{ timelineSourceInfo[event.source].label }}</strong>
                  <span>{{ event.title }}</span>
                </span>
              </button>

              <div v-if="visibleEvents.length === 0" class="no-results">
                <strong>No events match these filters.</strong>
                <span>Try removing a filter or using a broader keyword.</span>
              </div>
            </div>
          </div>
        </div>

        <v-card v-if="selectedEvent && selectedIndex >= 0" class="event-detail" variant="elevated">
          <v-card-actions class="detail-actions">
            <v-btn variant="text" :disabled="selectedIndex <= 0" @click="moveSelection(-1)">
              Previous event
            </v-btn>
            <span>{{ selectedIndex + 1 }} / {{ visibleEvents.length }}</span>
            <v-btn
              variant="text"
              :disabled="selectedIndex < 0 || selectedIndex >= visibleEvents.length - 1"
              @click="moveSelection(1)"
            >
              Next event
            </v-btn>
          </v-card-actions>
          <v-divider />
          <v-card-text>
            <div class="detail-topline">
              <div class="detail-badges">
                <span
                  class="detail-source"
                  :class="selectedEvent.source === 'general' ? 'general-source' : 'spitalian-source'"
                >
                  {{ timelineSourceInfo[selectedEvent.source].label }}
                </span>
                <span class="detail-book">KatharSys</span>
              </div>
              <span class="detail-pages">{{ timelineSourceInfo[selectedEvent.source].pages }}</span>
            </div>

            <div class="detail-heading">
              <span class="detail-year">{{ selectedEvent.year }}</span>
              <div class="detail-copy">
                <h2>{{ selectedEvent.title }}</h2>
                <div v-if="eventCults(selectedEvent).length || eventRegions(selectedEvent).length" class="detail-tags">
                  <span v-for="cult in eventCults(selectedEvent)" :key="`cult-${cult}`" class="meta-tag">
                    {{ cult }}
                  </span>
                  <span v-for="region in eventRegions(selectedEvent)" :key="`region-${region}`" class="meta-tag region-tag">
                    {{ region }}
                  </span>
                </div>
                <p>{{ eventText(selectedEvent) }}</p>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card v-else class="event-detail empty-detail" variant="elevated">
          <v-card-text>
            <strong>No event selected</strong>
            <p>Adjust the filters to restore matching events.</p>
          </v-card-text>
        </v-card>
      </div>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  timelineEvents,
  timelineSourceInfo,
  type TimelineEvent,
  type TimelineSource
} from '@/config/timeline'
import { timelineBookText } from '@/config/timelineBookText'

const PIXELS_PER_YEAR = 14
const TIMELINE_PADDING = 84
const AXIS_STEP = 25
const SOURCE_NAME = 'KatharSys'

const archiveOptions = [
  { title: 'Canon', value: 'general' },
  { title: 'Spitalian Archives', value: 'spitalian' }
]

const cultRules: Array<{ name: string; terms: RegExp }> = [
  { name: 'Anabaptists', terms: /\banabapt|\brebus\b/i },
  { name: 'Anubians', terms: /\banubian/i },
  { name: 'Apocalyptics', terms: /\bapocalyptic/i },
  { name: 'Chroniclers', terms: /\bchronicler|\bstreamer/i },
  { name: 'Clanners', terms: /\bclanner|\bclans?\b|\bvoivode/i },
  { name: 'Hellvetics', terms: /\bhellvetic/i },
  { name: 'Jehammedans', terms: /\bjehammed/i },
  { name: 'Judges', terms: /\bjudges?\b|\bprotectorate\b|\bprotectors?\b/i },
  { name: 'Neolibyans', terms: /\bneolibyan|\bthe libyan\b/i },
  { name: 'Palers', terms: /\bpalers?\b/i },
  { name: 'Scourgers', terms: /\bscourger/i },
  { name: 'Scrappers', terms: /\bscrapper/i },
  { name: 'Spitalians', terms: /\bspitalian|\bspital\b|\bpreservist|\bfamulancer/i }
]

const regionRules: Array<{ name: string; terms: RegExp }> = [
  { name: 'Borca', terms: /\bborca\b|\bjustitian\b|\bexalt\b|\bliqua\b|\bcologne\b|\bdortmund\b|\bruhr\b|\bmenden\b/i },
  { name: 'Franka', terms: /\bfranka\b|\bparis\b|\bsouffrance\b|\bbritain\b|\bbriton\b/i },
  { name: 'Pollen', terms: /\bpollen\b|\bdanzig\b|\blodz\b|\bbreslau\b|\bpoland\b/i },
  { name: 'Balkhan', terms: /\bbalkhan|\blaibach\b|\bpraha\b/i },
  { name: 'Purgare', terms: /\bpurgare\b|\bpurgan|\badriatic\b|\bsyracuse\b/i },
  { name: 'Hybrispania', terms: /\bhybrispania\b|\bspain\b|\bspanish\b|\bgibraltar\b|\bandalusia\b/i },
  { name: 'Africa', terms: /\bafrica|\blibya\b|\balgeria\b|\bagadez\b|\bnairobi\b|côte d.?ivoire|\babidjan\b|\bcongo\b|\blake victoria\b|\bnile\b|\bmasai\b|\bngorongoro\b|\bqabis\b|\btripol\b/i },
  { name: 'Global', terms: /\bworldwide\b|\bglobal\b|\bearth\b|\bunited nations\b|\btranshuman era\b|\bstream\b/i }
]

const searchQuery = ref('')
const selectedArchives = ref<TimelineSource[]>([])
const selectedSources = ref<string[]>([])
const selectedCults = ref<string[]>([])
const selectedRegions = ref<string[]>([])

const eventText = (event: TimelineEvent) => timelineBookText[event.id] ?? event.summary
const eventCorpus = (event: TimelineEvent) =>
  [event.title, event.summary, eventText(event), timelineSourceInfo[event.source].label, SOURCE_NAME]
    .join(' ')
    .toLowerCase()

const eventCults = (event: TimelineEvent) => {
  const corpus = eventCorpus(event)
  return cultRules.filter((rule) => rule.terms.test(corpus)).map((rule) => rule.name)
}

const eventRegions = (event: TimelineEvent) => {
  const corpus = eventCorpus(event)
  return regionRules.filter((rule) => rule.terms.test(corpus)).map((rule) => rule.name)
}

const cultOptions = cultRules.map((rule) => rule.name)
const regionOptions = regionRules.map((rule) => rule.name)
const sourceOptions = [SOURCE_NAME]

const minimumEventYear = Math.min(...timelineEvents.map((event) => event.year))
const maximumEventYear = Math.max(...timelineEvents.map((event) => event.year))
const axisStart = Math.floor(minimumEventYear / AXIS_STEP) * AXIS_STEP
const axisEnd = Math.ceil(maximumEventYear / AXIS_STEP) * AXIS_STEP
const timelineHeight = (axisEnd - axisStart) * PIXELS_PER_YEAR + TIMELINE_PADDING * 2

const axisYears = Array.from(
  { length: Math.floor((axisEnd - axisStart) / AXIS_STEP) + 1 },
  (_, index) => axisStart + index * AXIS_STEP
)

const yearPosition = (year: number) =>
  TIMELINE_PADDING + (year - axisStart) * PIXELS_PER_YEAR

const positionStyle = (year: number) => ({
  top: `${yearPosition(year)}px`
})

const canvasStyle = computed(() => ({
  height: `${timelineHeight}px`
}))

const visibleEvents = computed(() => {
  const terms = searchQuery.value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  return timelineEvents
    .filter((event) => {
      if (selectedArchives.value.length && !selectedArchives.value.includes(event.source)) return false
      if (selectedSources.value.length && !selectedSources.value.includes(SOURCE_NAME)) return false

      const cults = eventCults(event)
      if (selectedCults.value.length && !selectedCults.value.some((cult) => cults.includes(cult))) return false

      const regions = eventRegions(event)
      if (selectedRegions.value.length && !selectedRegions.value.some((region) => regions.includes(region))) return false

      if (terms.length) {
        const corpus = [
          eventCorpus(event),
          ...cults,
          ...regions
        ].join(' ').toLowerCase()
        if (!terms.every((term) => corpus.includes(term))) return false
      }

      return true
    })
    .sort((a, b) => a.year - b.year || a.source.localeCompare(b.source))
})

const selectedEvent = ref<TimelineEvent | undefined>(timelineEvents[0])

const selectedIndex = computed(() => {
  if (!selectedEvent.value) return -1
  return visibleEvents.value.findIndex((event) => event.id === selectedEvent.value?.id)
})

const hasActiveFilters = computed(() =>
  Boolean(
    searchQuery.value.trim() ||
    selectedArchives.value.length ||
    selectedSources.value.length ||
    selectedCults.value.length ||
    selectedRegions.value.length
  )
)

const sameYearEvents = (event: TimelineEvent) =>
  visibleEvents.value.filter((candidate) => candidate.year === event.year)

const markerOffset = (event: TimelineEvent) => {
  const siblings = sameYearEvents(event)
  const index = siblings.findIndex((candidate) => candidate.id === event.id)
  if (siblings.length <= 1 || index < 0) return 0
  return (index - (siblings.length - 1) / 2) * 22
}

const markerStyle = (event: TimelineEvent) => ({
  top: `${yearPosition(event.year)}px`,
  left: `calc(50% + var(--axis-shift) + ${markerOffset(event)}px)`
})

const markerClasses = (event: TimelineEvent) => ({
  'general-marker': event.source === 'general',
  'spitalian-marker': event.source === 'spitalian',
  selected: selectedEvent.value?.id === event.id,
  'label-left': markerOffset(event) <= 0 && sameYearEvents(event).length > 1
})

const selectEvent = (event: TimelineEvent) => {
  selectedEvent.value = event
}

const scrollSelectedIntoView = async () => {
  await nextTick()
  if (!selectedEvent.value) return

  const marker = document.getElementById(`timeline-${selectedEvent.value.id}`)
  marker?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
}

const moveSelection = (direction: number) => {
  const nextIndex = selectedIndex.value + direction
  if (nextIndex < 0 || nextIndex >= visibleEvents.value.length) return

  selectedEvent.value = visibleEvents.value[nextIndex]
  void scrollSelectedIntoView()
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedArchives.value = []
  selectedSources.value = []
  selectedCults.value = []
  selectedRegions.value = []
}

watch(
  visibleEvents,
  (events) => {
    if (!events.length) {
      selectedEvent.value = undefined
      return
    }

    if (!selectedEvent.value || !events.some((event) => event.id === selectedEvent.value?.id)) {
      selectedEvent.value = events[0]
    }
  },
  { flush: 'post' }
)
</script>

<style scoped>
.timeline-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 80% 0%, rgba(146, 28, 28, 0.18), transparent 34rem),
    linear-gradient(180deg, #171717 0%, #0f0f0f 100%);
  color: #ececec;
}

.timeline-container {
  max-width: 1800px;
  padding: 42px clamp(16px, 3vw, 56px) 64px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
  margin-bottom: 28px;
}

.timeline-kicker {
  color: #bdbdbd;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.35em;
  margin-bottom: 8px;
}

.timeline-header h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.6rem);
  font-weight: 300;
  letter-spacing: 0.04em;
  line-height: 1;
}

.timeline-header p {
  max-width: 1050px;
  margin: 18px 0 0;
  color: #bdbdbd;
  font-size: 1rem;
  line-height: 1.65;
}

.timeline-header p strong {
  color: #e1e1e1;
}

.timeline-stat {
  min-width: 150px;
  border-left: 2px solid #9b2226;
  padding: 8px 0 6px 18px;
}

.timeline-stat span {
  display: block;
  font-size: 2.1rem;
  line-height: 1;
}

.timeline-stat small {
  display: block;
  margin-top: 8px;
  color: #9e9e9e;
  font-size: 0.68rem;
  letter-spacing: 0.16em;
}

.timeline-controls {
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.045) !important;
  border: 1px solid rgba(255, 255, 255, 0.09);
}

.timeline-controls :deep(.v-card-text) {
  padding: 18px;
}

.filter-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.control-copy strong,
.control-copy span {
  display: block;
}

.control-copy span {
  margin-top: 3px;
  color: #9e9e9e;
  font-size: 0.82rem;
}

.clear-filter-button {
  flex: 0 0 auto;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1.35fr) repeat(4, minmax(170px, 1fr));
  gap: 12px;
}

.filter-grid :deep(.v-field) {
  background: rgba(0, 0, 0, 0.14);
}

.filter-grid :deep(.v-chip) {
  max-width: 100%;
}

.source-key {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px 18px;
  min-height: 28px;
  margin: 0 2px 8px;
  color: #a8a8a8;
  font-size: 0.72rem;
}

.source-key-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.source-key-item i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.general-key i {
  background: #c93838;
}

.spitalian-key i {
  background: #90a4ae;
}

.source-key-note {
  color: #777;
}

.timeline-workspace {
  display: grid;
  grid-template-columns: minmax(295px, 380px) minmax(0, 1fr);
  align-items: start;
  gap: clamp(18px, 2.5vw, 34px);
}

.timeline-left {
  min-width: 0;
}

.timeline-frame {
  overflow: visible;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.28);
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.24);
}

.timeline-column-head {
  position: sticky;
  top: 0;
  z-index: 8;
  display: grid;
  grid-template-columns: 52px 1fr;
  grid-template-rows: auto auto;
  min-height: 58px;
  padding: 10px 18px 9px 0;
  background: #151515;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px 8px 0 0;
  border-top: 3px solid rgba(201, 56, 56, 0.82);
}

.timeline-column-head > span {
  grid-row: 1 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 0;
  color: #8b8b8b;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
}

.timeline-column-head strong {
  font-size: 0.76rem;
  letter-spacing: 0.11em;
  text-align: center;
}

.timeline-column-head small {
  margin-top: 3px;
  color: #777;
  font-size: 0.63rem;
  text-align: center;
}

.timeline-vertical-canvas {
  --axis-shift: 26px;
  position: relative;
  width: 100%;
  min-height: 1000px;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.018) 0 52px, transparent 52px);
}

.axis-centerline {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(50% + var(--axis-shift));
  z-index: 2;
  width: 2px;
  transform: translateX(-1px);
  background: linear-gradient(180deg, #c93838 0%, #777 48%, #90a4ae 100%);
  opacity: 0.72;
}

.year-tick {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.045);
  pointer-events: none;
}

.year-tick.major {
  background: rgba(255, 255, 255, 0.095);
}

.year-tick span {
  position: absolute;
  left: 0;
  top: 0;
  width: 52px;
  transform: translateY(-50%);
  text-align: center;
  color: #9b9b9b;
  font-size: 0.93rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.year-tick.major span {
  color: #c0c0c0;
}

.event-marker {
  position: absolute;
  z-index: 3;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #e0e0e0;
  cursor: pointer;
  transform: translate(-50%, -50%);
  outline: none;
}

.marker-dot {
  position: absolute;
  top: 7px;
  left: 7px;
  width: 12px;
  height: 12px;
  border: 2px solid #151515;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.24);
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.general-marker .marker-dot {
  background: #c93838;
}

.spitalian-marker .marker-dot {
  background: #90a4ae;
}

.event-marker:hover .marker-dot,
.event-marker:focus-visible .marker-dot,
.event-marker.selected .marker-dot {
  transform: scale(1.55);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.52);
}

.marker-label {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  display: none;
  width: 190px;
  padding: 8px 10px;
  transform: translateY(-50%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 4px;
  background: #202020;
  box-shadow: 0 5px 18px rgba(0, 0, 0, 0.38);
  text-align: left;
  pointer-events: none;
}

.event-marker.label-left .marker-label {
  left: auto;
  right: calc(100% + 10px);
}

.event-marker:hover,
.event-marker:focus-visible,
.event-marker.selected {
  z-index: 7;
}

.event-marker:hover .marker-label,
.event-marker:focus-visible .marker-label {
  display: block;
}

.marker-label strong,
.marker-label span {
  display: block;
}

.marker-label strong {
  color: #ababab;
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
}

.marker-label span {
  margin-top: 3px;
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.3;
}

.no-results {
  position: absolute;
  top: 88px;
  left: 50%;
  width: min(320px, calc(100% - 120px));
  transform: translateX(-50%);
  padding: 18px;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  color: #9e9e9e;
  text-align: center;
}

.no-results strong,
.no-results span {
  display: block;
}

.no-results strong {
  color: #d5d5d5;
}

.no-results span {
  margin-top: 5px;
  font-size: 0.8rem;
}

.event-detail {
  position: sticky;
  top: 24px;
  margin: 0;
  background: #1a1a1a !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.event-detail :deep(.v-card-text) {
  padding: clamp(22px, 3vw, 38px);
}

.detail-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 24px;
}

.detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-source,
.detail-book {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 9px;
  border-radius: 2px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.general-source {
  background: rgba(184, 50, 54, 0.2);
  color: #ef9a9a;
  border: 1px solid rgba(184, 50, 54, 0.42);
}

.spitalian-source {
  background: rgba(120, 144, 156, 0.18);
  color: #cfd8dc;
  border: 1px solid rgba(120, 144, 156, 0.4);
}

.detail-book {
  color: #bdbdbd;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
}

.detail-pages {
  color: #777;
  font-size: 0.72rem;
}

.detail-heading {
  display: grid;
  grid-template-columns: minmax(132px, 178px) minmax(0, 1fr);
  gap: clamp(18px, 3vw, 40px);
}

.detail-year {
  display: block;
  color: #d7d7d7;
  font-size: clamp(2.2rem, 4.2vw, 4rem);
  font-weight: 200;
  letter-spacing: -0.04em;
  line-height: 0.95;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.detail-copy {
  min-width: 0;
}

.detail-heading h2 {
  margin: 0 0 10px;
  color: #f0f0f0;
  font-size: clamp(1.3rem, 2.2vw, 2rem);
  font-weight: 400;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 14px;
}

.meta-tag {
  padding: 3px 7px;
  border: 1px solid rgba(201, 56, 56, 0.3);
  border-radius: 999px;
  color: #cfcfcf;
  background: rgba(201, 56, 56, 0.08);
  font-size: 0.66rem;
}

.region-tag {
  border-color: rgba(144, 164, 174, 0.32);
  background: rgba(144, 164, 174, 0.08);
}

.detail-heading p {
  max-width: 1100px;
  margin: 0;
  color: #bdbdbd;
  font-size: 0.95rem;
  line-height: 1.72;
  white-space: pre-line;
}

.detail-actions {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 58px;
  padding: 7px 12px;
}

.detail-actions > :first-child {
  justify-self: start;
}

.detail-actions > :last-child {
  justify-self: end;
}

.detail-actions span {
  color: #777;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.empty-detail strong {
  color: #d6d6d6;
}

.empty-detail p {
  margin: 8px 0 0;
  color: #8e8e8e;
}

@media (max-width: 1350px) {
  .filter-grid {
    grid-template-columns: repeat(3, minmax(190px, 1fr));
  }
}

@media (max-width: 1000px) {
  .timeline-workspace {
    grid-template-columns: 1fr;
  }

  .event-detail {
    position: static;
    grid-row: 2;
  }

  .timeline-left {
    grid-row: 1;
  }
}

@media (max-width: 700px) {
  .timeline-container {
    padding-top: 24px;
  }

  .timeline-header {
    align-items: flex-start;
  }

  .timeline-stat {
    display: none;
  }

  .filter-heading {
    align-items: flex-start;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .timeline-column-head {
    grid-template-columns: 52px 1fr;
  }

  .timeline-vertical-canvas {
    --axis-shift: 26px;
    background:
      linear-gradient(90deg, rgba(255,255,255,0.018) 0 52px, transparent 52px);
  }

  .event-detail {
    grid-row: 1;
  }

  .timeline-left {
    grid-row: 2;
  }

  .detail-heading {
    grid-template-columns: 1fr;
  }

  .detail-year {
    font-size: 2.25rem;
  }

  .detail-actions {
    grid-template-columns: 1fr 1fr;
  }

  .detail-actions span {
    display: none;
  }

  .marker-label {
    width: 160px;
  }
}
</style>
