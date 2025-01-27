const UserModel = require("../models/users.model");
const { handleErrorResponse, CustomErrorHandler } = require("../middleware/CustomErrorHandler");

module.exports.userList = async (request, response) => {
    try {
        const { user } = request.body;
        const { page = 1, limit = 10 } = request.query;

        const adminData = await UserModel.findOne({
            _id: user._id,
            role: "ADMIN",
            isDeleted: false,
        });
        if(!adminData) throw CustomErrorHandler.unAuthorized("Access Denied!");
    
        const options = {
            page,
            limit,
            sort: { createdAt: -1 }
        };
        
        let query = {
            role: { $ne: "ADMIN" },
        };
    
        const userData = await UserModel.paginate(query, options);
        if (userData.totalDocs === 0) throw CustomErrorHandler.notFound("User List Not Found!");
        
        return response.json({
            status: true,
            message: `${userData.docs.length} User Found.`,
            data: userData,
        });
    } catch (e) {
        handleErrorResponse(e, response);
    }
};

module.exports.userById = async (request, response) => {
    try {
        const { user } = request.body;
        const { id } = request.params;

        const adminData = await UserModel.findOne({
            _id: user._id,
            role: "ADMIN",
            isDeleted: false,
        });
        if(!adminData) throw CustomErrorHandler.unAuthorized("Access Denied!");
    
        const userData = await UserModel.findById(id);

        if (!userData) throw CustomErrorHandler.notFound("User Not Found!");

        return response.json({
            status: true,
            message: "User Details",
            data: userData,
        });
    } catch (e) {
        handleErrorResponse(e, response);
    }
};