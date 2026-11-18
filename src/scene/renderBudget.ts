import type {Quality} from './clouds/layout'

export function renderBudget(quality:Quality,compact:boolean,displayDpr:number){
  const low=quality==='low'
  const cap=compact ? (low?1:1.3) : (low?.9:1.5)
  const max=Math.min(Math.max(.65,displayDpr),cap)
  return {max,min:Math.min(max,compact?.7:low?.65:.85),mist:compact?(low?3:6):(low?4:9),
    basin:low?44:86,farSegments:low?48:80}
}

// A long idle interval isn't a performance sample. Windows and cooldown prevent DPR oscillation.
export function nextDpr(current:number,averageMs:number,min:number,max:number){
  if(averageMs>31)return Math.max(min,Math.round((current-.15)*100)/100)
  if(averageMs<18)return Math.min(max,Math.round((current+.10)*100)/100)
  return current
}
