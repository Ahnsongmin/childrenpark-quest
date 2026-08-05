/* 오늘의 동물 상태 — 사육사가 keeper.html에서 체크한 결과를 붙여 넣는 파일.
   형식: { 동물id: { indoor: 내실여부, needObserve: 오늘 특별관찰, note: '한 줄 메모', updated: 'YYYY-MM-DD' } }
   비어 있으면 전체 동물을 관람 가능으로 간주한다 — 입력이 없는 날에도 서비스는 정상 동작.
   시제품은 정적 파일이며, 본사업에서는 사육사 계정으로 저장되는 서버 데이터로 대체한다. */
export const ANIMAL_STATUS = {};
