const orderTable = {
  1: "asc",
  "-1": "desc",
};

const strapiProps = ["_id", "__v", "id", "createdAt", "updatedAt"];

const deleteProps = (object, props) => props.map(prop => Reflect.deleteProperty(object, prop));
const deleteStrapiProps = object => deleteProps(object, strapiProps);

const deletePropsRet = (object, props) => {
  deleteProps(object, props);
  return object;
};
const deleteStrapiPropsRet = object => deletePropsRet(object, strapiProps);

module.exports = {
  orderTable,
  strapiProps,
  deleteProps,
  deleteStrapiProps,
  deletePropsRet,
  deleteStrapiPropsRet,
};
