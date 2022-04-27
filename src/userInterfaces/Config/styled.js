import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  h3 {
    margin: 0;
  }
`;

export const Spacer = styled.div`
  height: ${props => props.height || 8}px;
`;

export const Row = styled.div`
  display: flex;
  .select-component{
    width: 100%;
  }
  .email-label{
    width: 80px;
    margin-right: 5px;
  }
  span{
    padding-bottom: 10px;
  }
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
