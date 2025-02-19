<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useDark } from '@vueuse/core'
import { useDataStore } from '../store/dataStore'

const dataStore = useDataStore()
const isDark = useDark()

const container = ref<HTMLElement | null>(null)
let plot: uPlot | null = null

const darkTheme = {
  background: '#1e1e1e',
  gridColor: '#2c2c2c',
  textColor: '#d4d4d4',
  lineColors: ['#4a9eff']
}

const lightTheme = {
  background: '#ffffff',
  gridColor: '#f0f0f0',
  textColor: '#333333',
  lineColors: ['#3366ff']
}

const currentTheme = computed(() => isDark.value ? darkTheme : lightTheme)

function debounce(fn) {
  let raf;

  return (...args) => {
    if (raf)
      return;

    raf = requestAnimationFrame(() => {
      fn(...args);
      raf = null;
    });
  };
}

function placeDiv(par, cls) {
  let el = doc.createElement("div");
  el.classList.add(cls);
  par.appendChild(el);
  return el;
}

function on(ev, el, fn) {
  el.addEventListener(ev, fn);
}

function off(ev, el, fn) {
  el.removeEventListener(ev, fn);
}


let initXmin = 1;
let initXmax = 4.5;

//----------------

let x0;
let lft0;
let wid0;

const lftWid = {left: null, width: null};
const minMax = {min: null, max: null};

function update(newLft, newWid) {
  let newRgt = newLft + newWid;
  let maxRgt = uRanger.bbox.width / devicePixelRatio;

  if (newLft >= 0 && newRgt <= maxRgt) {
    select(newLft, newWid);
    zoom(newLft, newWid);
  }
}

function select(newLft, newWid) {
  lftWid.left = newLft;
  lftWid.width = newWid;
  uRanger.setSelect(lftWid, false);
}

function zoom(newLft, newWid) {
  minMax.min = uRanger.posToVal(newLft, 'x');
  minMax.max = uRanger.posToVal(newLft + newWid, 'x');
  uZoomed.setScale('x', minMax);
}

function bindMove(e, onMove) {
  x0 = e.clientX;
  lft0 = uRanger.select.left;
  wid0 = uRanger.select.width;

  const _onMove = debounce(onMove);
  on("mousemove", doc, _onMove);

  const _onUp = e => {
    off("mouseup", doc, _onUp);
    off("mousemove", doc, _onMove);
    viaGrip = false;
  };
  on("mouseup", doc, _onUp);

  e.stopPropagation();
}

//----------------

const initPlot = () => {
  if (!container.value) return

  const opts = {
    width: container.value.clientWidth,
    height: 100,
    ms: 1,
    cursor: {
      x: false,
      y: false,
      points: {
        show: false,
      },
      drag: {
        setScale: false,
        setSelect: true,
        x: true,
        y: false,
      },
    },
    select: {
      show: false,
    },
    legend: {
      show: false
    },
    scales: {
      x: {
        time: true,
      },
      y: {
        auto: true,
      },
    },
    axes: [
      {
        scale: 'x',
        grid: {
          show: true,
          stroke: currentTheme.value.gridColor,
        },
        ticks: {
          show: true,
          stroke: currentTheme.value.gridColor,
        },
        border: {
          show: true,
          stroke: currentTheme.value.gridColor,
        },
      },
      {
        scale: 'y',
        show: false,
      },
    ],
    series: [
      {},
      {
        stroke: currentTheme.value.lineColors[0],
        width: 1,
        fill: currentTheme.value.lineColors[0] + '20',
      },
    ],
    hooks: {
      ready: [
        uRanger => {
          let left = Math.round(uRanger.valToPos(initXmin, 'x'));
          let width = Math.round(uRanger.valToPos(initXmax, 'x')) - left;
          let height = uRanger.bbox.height / devicePixelRatio;
          uRanger.setSelect({left, width, height}, false);

          const sel = uRanger.root.querySelector(".u-select");

          on("mousedown", sel, e => {
            bindMove(e, e => update(lft0 + (e.clientX - x0), wid0));
          });

          on("mousedown", placeDiv(sel, "u-grip-l"), e => {
            bindMove(e, e => update(lft0 + (e.clientX - x0), wid0 - (e.clientX - x0)));
          });

          on("mousedown", placeDiv(sel, "u-grip-r"), e => {
            bindMove(e, e => update(lft0, wid0 + (e.clientX - x0)));
          });
        }
      ],
      setSelect: [
        uRanger => {
          zoom(uRanger.select.left, uRanger.select.width);
        }
      ],
    }
  }

  plot = new uPlot(opts, [[0], [0]], container.value)

  const handleResize = () => {
    if (plot && container.value) {
      plot.setSize({
        width: container.value.clientWidth,
        height: 100
      })
    }
  }

  window.addEventListener('resize', handleResize)

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    plot?.destroy()
  })
}

const updatePlot = () => {
  if (!plot) return

  const data = dataStore.dataPoints
  if (data.length === 0) {
    plot.setData([[0], [0]])
    return
  }

  const timestamps = data.map(point => point.timestamp)
  const values = data.map(point => {
    const total = Object.values(point.values).reduce((sum, val) => sum + val, 0)
    return total / Object.keys(point.values).length
  })

  plot.setData([timestamps, values])
}

// 监听数据变化
watch(() => dataStore.dataPoints, updatePlot, { deep: true })

// 监听主题变化
watch(currentTheme, () => {
  plot?.destroy()
  initPlot()
  updatePlot()
})

onMounted(() => {
  initPlot()
})
</script>

<template>
  <div class="time-range-control">
    <div class="control-header">
      <el-switch
        v-model="dataStore.isRealtime"
        active-text="实时"
        inactive-text="历史"
        @change="dataStore.toggleRealtime"
      />
    </div>
    <div ref="container" class="plot-container"></div>
  </div>
</template>

<style scoped lang="less">
.time-range-control {
  height: 140px;
  padding: 8px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
}

.control-header {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px;
}

.plot-container {
  height: 100px;
}
</style>