import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  h3 {
    color: rgba(0, 0, 0, 0.7);
    font-size: 14px;
    font-weight: 600;
    margin: 0;
  }
  p {
    color: rgba(0, 0, 0, 0.7);
    font-size: 12px;
    font-weight: 400;
    margin: 0;
  }
  ol {
    color: rgba(0, 0, 0, 0.7);
    font-size: 14px;
    font-weight: 400;
    padding-inline-start: 16px;
    line-height: 1.7em;
  }
`;

export const Spacer = styled.div`
  height: ${props => props.height || 8}px;
`;

export const Row = styled.div`
  display: flex;
`;

export const CardContainer = styled.div`
  width: 33%;
  margin: 0 8px;

  :first-child {
    margin-left: 0;
  }
  :last-child {
    margin-right: 0;
  }
`;
